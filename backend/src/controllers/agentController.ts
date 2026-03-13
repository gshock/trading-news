import type { Request, Response } from "express";
import type { SchedulerService } from "../services/schedulerService.js";

export class AgentController {
  constructor(private schedulerService: SchedulerService) {
    this.runBriefing = this.runBriefing.bind(this);
    this.getSchedulerStatus = this.getSchedulerStatus.bind(this);
  }

  /** POST /agents/run — kick off the pre-market briefing on demand */
  async runBriefing(req: Request, res: Response): Promise<void> {
    const { email } = req.body as { email?: string };
    try {
      console.log(
        `[AgentController] On-demand briefing requested${email ? ` (preview: ${email})` : ""}`
      );
      const briefing = await this.schedulerService.runNow(email);
      res.status(200).json(briefing);
    } catch (error) {
      console.error("[AgentController] Briefing failed:", error);
      res.status(500).json({
        error: "Briefing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /** GET /agents/status — check scheduler health */
  getSchedulerStatus(_req: Request, res: Response): void {
    res.status(200).json({
      status: "running",
      schedule: "5:30 AM EST, Monday-Friday",
      timezone: "America/New_York",
    });
  }
}
