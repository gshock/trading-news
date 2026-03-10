import express from "express";
import { randomBytes } from "node:crypto";
import { TableStorageService } from "../services/tableStorageService.js";
import { EmailService } from "../services/emailService.js";

const router = express.Router();

// Lazy initialization - reuse a single EmailService instance across requests
let emailService: EmailService;

function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}

// POST /subscribe - Add a new subscription
router.post("/subscribe", async (req, res) => {
  try {
    const { email, topics, source } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const tableService = new TableStorageService();

    const existing = await tableService.getSubscription(email);

    // Active or pending subscriptions cannot be duplicated
    if (existing && existing.status !== "unsubscribed") {
      return res
        .status(409)
        .json({ error: "Email already subscribed", status: existing.status });
    }

    const confirmToken = randomBytes(32).toString("hex");

    if (existing && existing.status === "unsubscribed") {
      // Re-subscribe: reset the existing entry back to pending with a new token
      await tableService.resetSubscription(email, confirmToken, topics);
    } else {
      // New subscription
      const options: any = {
        status: "pending" as const,
        source: source || "api",
        confirmToken,
      };
      if (topics) options.topics = topics;
      if (req.ip) options.ip = req.ip;
      const userAgent = req.get("user-agent");
      if (userAgent) options.ua = userAgent;

      await tableService.addSubscription(email, options);
    }

    // Send confirmation email
    await getEmailService().sendConfirmationEmail(email, confirmToken);

    res.status(201).json({ message: "Check your email to confirm your subscription", email });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

// GET /subscription/confirm?token=... - Confirm subscription and redirect to frontend
router.get("/subscription/confirm", async (req, res) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const rawToken = req.query.token;

    const isValidToken =
      typeof rawToken === "string" && /^[0-9a-f]{64}$/i.test(rawToken);

    if (!isValidToken) {
      return res.redirect(`${frontendUrl}?confirmed=error`);
    }

    const token = rawToken as string;
    const tableService = new TableStorageService();
    const subscription = await tableService.getSubscriptionByToken(token);

    if (!subscription) {
      return res.redirect(`${frontendUrl}?confirmed=error`);
    }

    if (subscription.status === "active") {
      return res.redirect(`${frontendUrl}?confirmed=already`);
    }

    await tableService.updateSubscriptionStatus(
      subscription.rowKey,
      "active",
      new Date().toISOString(),
    );

    return res.redirect(`${frontendUrl}?confirmed=success`);
  } catch (error) {
    console.error("Confirm subscription error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${frontendUrl}?confirmed=error`);
  }
});

// GET /subscription/:email - Get subscription status
router.get("/subscription/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const tableService = new TableStorageService();

    const subscription = await tableService.getSubscription(email);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    res.json(subscription);
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ error: "Failed to get subscription" });
  }
});

// PUT /subscription/:email/status - Update subscription status
router.put("/subscription/:email/status", async (req, res) => {
  try {
    const { email } = req.params;
    const { status } = req.body;

    if (!["pending", "active", "unsubscribed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const tableService = new TableStorageService();

    await tableService.updateSubscriptionStatus(
      email,
      status,
      status === "active" ? new Date().toISOString() : undefined,
    );

    const message =
      status === "unsubscribed" ? "You have been unsubscribed" : "Subscription updated";
    res.json({ message, email, status });
  } catch (error) {
    console.error("Update subscription error:", error);
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

// GET /subscriptions - List subscriptions by status
router.get("/subscriptions", async (req, res) => {
  try {
    const status = (req.query.status as string) || "active";

    if (!["pending", "active", "unsubscribed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const tableService = new TableStorageService();
    const subscriptions = await tableService.listSubscriptionsByStatus(
      status as "pending" | "active" | "unsubscribed",
    );

    res.json({ count: subscriptions.length, subscriptions });
  } catch (error) {
    console.error("List subscriptions error:", error);
    res.status(500).json({ error: "Failed to list subscriptions" });
  }
});

// DELETE /subscription/:email - Delete a subscription
router.delete("/subscription/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const tableService = new TableStorageService();

    await tableService.deleteSubscription(email);

    res.json({ message: "Subscription deleted", email });
  } catch (error) {
    console.error("Delete subscription error:", error);
    res.status(500).json({ error: "Failed to delete subscription" });
  }
});

export default router;
