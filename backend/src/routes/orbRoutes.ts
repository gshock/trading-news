import express from "express";
import rateLimit from "express-rate-limit";
import { OrbController } from "../controllers/orbController.js";
import { OrbOrchestratorService } from "../services/orbOrchestratorService.js";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";

const router = express.Router();

let orbController: OrbController;

function getController(): OrbController {
  if (!orbController) {
    orbController = new OrbController(new OrbOrchestratorService());
  }
  return orbController;
}

// Allow at most 5 on-demand ORB runs per hour per IP
const orbRunLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many ORB run requests, please try again later" },
});

/**
 * POST /api/v1/orb/run-945
 * Triggers the 9:45 AM ORB run on demand (folder prefix: 945AM_…).
 * Requires a valid API key.
 */
router.post("/orb/run-945", apiKeyAuth, orbRunLimiter, (req, res) => {
  return getController().run945(req, res);
});

/**
 * POST /api/v1/orb/run-1000
 * Triggers the 10:00 AM full ORB run on demand (folder prefix: orbAgent_…).
 * Requires a valid API key.
 */
router.post("/orb/run-1000", apiKeyAuth, orbRunLimiter, (req, res) => {
  return getController().run1000(req, res);
});

/**
 * POST /api/v1/orb/preview
 * Runs the full ORB pipeline using the previous trading session's candles.
 * Useful for testing outside market hours. Optional body: { "email": "you@example.com" }
 * to receive a test email. Requires a valid API key.
 */
router.post("/orb/preview", apiKeyAuth, orbRunLimiter, (req, res) => {
  return getController().runPreview(req, res);
});

export default router;
