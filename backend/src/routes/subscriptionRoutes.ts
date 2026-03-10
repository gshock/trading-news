import express from "express";
import { randomBytes } from "node:crypto";
import { TableStorageService } from "../services/tableStorageService.js";
import { EmailService } from "../services/emailService.js";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";

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
router.post("/subscribe", apiKeyAuth, async (req, res) => {
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

// GET /subscription/confirm?token=... - Legacy link support: redirect to frontend confirm page
// (Old confirmation emails link directly to this endpoint; we now redirect so confirmation
//  requires an explicit user action rather than a GET request that email scanners could trigger.)
router.get("/subscription/confirm", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const rawToken = req.query.token;
  const isValidToken =
    typeof rawToken === "string" && /^[0-9a-f]{64}$/i.test(rawToken);

  if (!isValidToken) {
    return res.redirect(`${frontendUrl}?confirmed=error`);
  }

  // Hand off to the frontend; the user must click "Confirm" there to activate.
  return res.redirect(`${frontendUrl}?token=${rawToken}`);
});

// POST /subscription/confirm - Activate subscription (called by frontend confirm button)
router.post("/subscription/confirm", async (req, res) => {
  try {
    const rawToken = req.body.token;
    const isValidToken =
      typeof rawToken === "string" && /^[0-9a-f]{64}$/i.test(rawToken);

    if (!isValidToken) {
      return res.status(400).json({ error: "Invalid or missing token" });
    }

    const token = rawToken as string;
    const tableService = new TableStorageService();
    const subscription = await tableService.getSubscriptionByToken(token);

    if (!subscription) {
      return res.status(404).json({ error: "Confirmation link is invalid or has expired" });
    }

    if (subscription.status === "active") {
      return res.status(200).json({ message: "already_confirmed" });
    }

    await tableService.updateSubscriptionStatus(
      subscription.rowKey,
      "active",
      new Date().toISOString(),
    );

    return res.status(200).json({ message: "confirmed" });
  } catch (error) {
    console.error("Confirm subscription error:", error);
    res.status(500).json({ error: "Failed to confirm subscription" });
  }
});

// GET /subscription/:email - Get subscription status
router.get("/subscription/:email", apiKeyAuth, async (req, res) => {
  try {
    const email = req.params.email as string;
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
router.put("/subscription/:email/status", apiKeyAuth, async (req, res) => {
  try {
    const email = req.params.email as string;
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
router.get("/subscriptions", apiKeyAuth, async (req, res) => {
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
router.delete("/subscription/:email", apiKeyAuth, async (req, res) => {
  try {
    const email = req.params.email as string;
    const tableService = new TableStorageService();

    await tableService.deleteSubscription(email);

    res.json({ message: "Subscription deleted", email });
  } catch (error) {
    console.error("Delete subscription error:", error);
    res.status(500).json({ error: "Failed to delete subscription" });
  }
});

export default router;
