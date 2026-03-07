import express from "express";
import rateLimit from "express-rate-limit";
import { AgentController } from "../controllers/agentController.js";
import { SchedulerService } from "../services/schedulerService.js";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";

const router = express.Router();

let schedulerService: SchedulerService;
let agentController: AgentController;

function initializeServices() {
  if (!agentController) {
    schedulerService = new SchedulerService();
    agentController = new AgentController(schedulerService);
  }
  return agentController;
}

// Rate-limit on-demand runs to 5 per hour
const agentRunLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many agent run requests, please try again later" },
});

// POST /agents/run — trigger a pre-market briefing on demand (requires API key)
router.post("/agents/run", apiKeyAuth, agentRunLimiter, (req, res) => {
  const controller = initializeServices();
  return controller.runBriefing(req, res);
});

// GET /agents/status — check scheduler status
router.get("/agents/status", (req, res) => {
  const controller = initializeServices();
  return controller.getSchedulerStatus(req, res);
});

export default router;
export { schedulerService };
