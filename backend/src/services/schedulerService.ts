import cron from "node-cron";
import { AgentOrchestratorService } from "./agentOrchestratorService.js";

export class SchedulerService {
  private task: cron.ScheduledTask | null = null;
  private orchestrator: AgentOrchestratorService;

  constructor() {
    this.orchestrator = new AgentOrchestratorService();
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
      {
        timezone: "America/New_York",
      },
    );

    console.log("[Scheduler] Pre-market briefing scheduled for 5:30 AM EST, Mon-Fri");
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log("[Scheduler] Stopped.");
    }
  }

  /** Run the briefing immediately (on-demand). */
  async runNow() {
    return this.orchestrator.runPreMarketBriefing();
  }
}
