import { createHash, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.SEND_MAIL_API_KEY;

  if (!apiKey) {
    console.error("SEND_MAIL_API_KEY environment variable is not set");
    res.status(503).json({ error: "Service temporarily unavailable" });
    return;
  }

  const provided =
    req.headers["x-api-key"] ?? req.headers["authorization"]?.replace(/^Bearer\s+/i, "");

  if (!provided) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Use constant-time comparison to prevent timing attacks
  const expected = createHash("sha256").update(apiKey).digest();
  const actual = createHash("sha256").update(String(provided)).digest();

  if (!timingSafeEqual(expected, actual)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
