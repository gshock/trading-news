import express from "express";
import { TableStorageService } from "../services/tableStorageService.js";

const router = express.Router();

// POST /subscribe - Add a new subscription
router.post("/subscribe", async (req, res) => {
  try {
    const { email, topics, source } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const tableService = new TableStorageService();

    // Check if already subscribed
    const existing = await tableService.getSubscription(email);
    if (existing) {
      return res
        .status(409)
        .json({ error: "Email already subscribed", status: existing.status });
    }

    // Add new subscription
    const options: any = {
      status: "pending" as const,
      source: source || "api",
    };
    if (topics) options.topics = topics;
    if (req.ip) options.ip = req.ip;
    const userAgent = req.get("user-agent");
    if (userAgent) options.ua = userAgent;

    await tableService.addSubscription(email, options);

    res.status(201).json({ message: "Subscription created", email });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ error: "Failed to create subscription" });
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

    res.json({ message: "Subscription updated", email, status });
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
