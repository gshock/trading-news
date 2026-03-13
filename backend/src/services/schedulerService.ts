import cron from "node-cron";
import { AgentOrchestratorService } from "./agentOrchestratorService.js";
import { OrbOrchestratorService } from "./orbOrchestratorService.js";

export class SchedulerService {
  private task: cron.ScheduledTask | null = null;
  private task945: cron.ScheduledTask | null = null;
  private task1000: cron.ScheduledTask | null = null;
  private orchestrator: AgentOrchestratorService;
  private orbOrchestrator: OrbOrchestratorService;

  constructor() {
    this.orchestrator = new AgentOrchestratorService();
    this.orbOrchestrator = new OrbOrchestratorService();
  }

  /**
   * Schedule the pre-market briefing to run at 5:30 AM EST every weekday.
   * Cron expression: minute hour day month weekday
   * "30 5 * * 1-5" = 5:30 AM, Monday through Friday
   * The timezone option ensures it runs in US Eastern time.
   */
  start(): void {
    if (this.task) {
      console.log("[Scheduler] Already running.");
      return;
    }

    this.task = cron.schedule(
      "30 5 * * 1-5",
      async () => {
        console.log(`[Scheduler] Triggered at ${new Date().toISOString()}`);
        try {
          const briefing = await this.orchestrator.runPreMarketBriefing();
          console.log(
            "[Scheduler] Briefing complete:",
            briefing.analysis ? "Analysis generated" : "No analysis",
          );
        } catch (error) {
          console.error("[Scheduler] Failed:", error);
        }
      },
      { timezone: "America/New_York" },
    );

    // ORB 9:46 AM — first 15-min candle (9:30–9:45) fully closed + 1 min buffer
    this.task945 = cron.schedule(
      "46 9 * * 1-5",
      async () => {
        console.log(`[Scheduler] ORB 9:46 AM triggered at ${new Date().toISOString()}`);
        try {
          await this.orbOrchestrator.run("945AM");
        } catch (error) {
          console.error("[Scheduler] ORB 9:46 AM failed:", error);
        }
      },
      { timezone: "America/New_York" },
    );

    // ORB 10:01 AM — second 15-min candle (9:45–10:00) fully closed + 1 min buffer
    this.task1000 = cron.schedule(
      "1 10 * * 1-5",
      async () => {
        console.log(`[Scheduler] ORB 10:01 AM triggered at ${new Date().toISOString()}`);
        try {
          await this.orbOrchestrator.run("orbAgent");
        } catch (error) {
          console.error("[Scheduler] ORB 10:01 AM failed:", error);
        }
      },
      { timezone: "America/New_York" },
    );

    console.log("[Scheduler] Pre-market briefing scheduled for 5:30 AM EST, Mon-Fri");
    console.log("[Scheduler] ORB 9:46 AM scheduled, Mon-Fri");
    console.log("[Scheduler] ORB 10:01 AM scheduled, Mon-Fri");
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    if (this.task945) {
      this.task945.stop();
      this.task945 = null;
    }
    if (this.task1000) {
      this.task1000.stop();
      this.task1000 = null;
    }
    console.log("[Scheduler] Stopped.");
  }

  /** Run the briefing immediately (on-demand). Pass `previewEmail` to send only to that address. */
  async runNow(previewEmail?: string) {
    return this.orchestrator.runPreMarketBriefing(previewEmail);
  }
}
