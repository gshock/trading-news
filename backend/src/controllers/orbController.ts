import type { Request, Response } from "express";
import { OrbOrchestratorService, type OrbRunType } from "../services/orbOrchestratorService.js";

export class OrbController {
  constructor(private orchestrator: OrbOrchestratorService) {
    this.run945 = this.run945.bind(this);
    this.run1000 = this.run1000.bind(this);
    this.runPreview = this.runPreview.bind(this);
  }

  /** POST /api/v1/orb/run-945 — 9:45 AM ORB preview (one candle complete) */
  async run945(req: Request, res: Response): Promise<void> {
    await this.runOrb("945AM", res);
  }

  /** POST /api/v1/orb/run-1000 — 10:00 AM full ORB (both candles complete) */
  async run1000(req: Request, res: Response): Promise<void> {
    await this.runOrb("orbAgent", res);
  }

  /**
   * POST /api/v1/orb/preview
   * Runs the full pipeline using the previous trading session's candles.
   * Accepts an optional `{ email }` body to send a test email.
   */
  async runPreview(req: Request, res: Response): Promise<void> {
    const { email } = req.body as { email?: string };
    try {
      console.log(
        `[OrbController] Triggered preview run${
          email ? ` (test email: ${email})` : ""
        }`,
      );
      const index = await this.orchestrator.runPreview(email);
      res.status(200).json({
        message: "ORB preview complete",
        folderTimestamp: index.folderTimestamp,
        count: index.count,
        createdUtc: index.createdUtc,
        emailSent: Boolean(email),
      });
    } catch (error) {
      console.error("[OrbController] Preview failed:", error);
      res.status(500).json({
        error: "ORB preview failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async runOrb(runType: OrbRunType, res: Response): Promise<void> {
    try {
      console.log(`[OrbController] Triggered ${runType} run`);
      const index = await this.orchestrator.run(runType);
      res.status(200).json({
        message: "ORB generation complete",
        runType,
        folderTimestamp: index.folderTimestamp,
        count: index.count,
        createdUtc: index.createdUtc,
      });
    } catch (error) {
      console.error(`[OrbController] ${runType} run failed:`, error);
      res.status(500).json({
        error: "ORB generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
