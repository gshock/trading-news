import { ForexFactoryAgent } from "../agents/forexFactoryAgent.js";
import { FearGreedAgent } from "../agents/fearGreedAgent.js";
import { EarningsAgent } from "../agents/earningsAgent.js";
import { SpyChartAgent } from "../agents/spyChartAgent.js";
import { FoundryService } from "./foundryService.js";
import { renderSpyChart } from "./chartRenderer.js";
import { TableStorageService } from "./tableStorageService.js";
import { EmailService } from "./emailService.js";
import type { PreMarketBriefing } from "../agents/types.js";

export class AgentOrchestratorService {
  private forexAgent: ForexFactoryAgent;
  private fearGreedAgent: FearGreedAgent;
  private earningsAgent: EarningsAgent;
  private spyChartAgent: SpyChartAgent;
  private foundryService: FoundryService;
  private tableStorageService: TableStorageService;
  private emailService: EmailService;

  constructor() {
    this.forexAgent = new ForexFactoryAgent();
    this.fearGreedAgent = new FearGreedAgent();
    this.earningsAgent = new EarningsAgent();
    this.spyChartAgent = new SpyChartAgent();
    this.foundryService = new FoundryService();
    this.tableStorageService = new TableStorageService();
    this.emailService = new EmailService();
  }

  /**
   * Runs all four agents in parallel, then sends results to Foundry for analysis.
   */
  async runPreMarketBriefing(): Promise<PreMarketBriefing> {
    console.log("[Orchestrator] Starting pre-market briefing...");
    const startTime = Date.now();

    // Run all four agents concurrently
    const [forexResult, fearGreedResult, earningsResult, spyChartResult] = await Promise.all([
      this.forexAgent.collect(),
      this.fearGreedAgent.collect(),
      this.earningsAgent.collect(),
      this.spyChartAgent.collect(),
    ]);

    console.log(
      `[Orchestrator] Agents completed in ${Date.now() - startTime}ms`,
      `| Forex: ${forexResult.success ? `${forexResult.data?.length ?? 0} events` : "FAILED"}`,
      `| Fear&Greed: ${fearGreedResult.success ? `Score ${fearGreedResult.data?.score}` : "FAILED"}`,
      `| Earnings: ${earningsResult.success ? `${earningsResult.data?.length ?? 0} companies` : "FAILED"}`,
      `| SPY Chart: ${spyChartResult.success ? `$${spyChartResult.data?.latestClose} (${spyChartResult.data?.position} SMA)` : "FAILED"}`,
    );

    // Render SPY chart image
    let spyChartImage: Buffer | null = null;
    if (spyChartResult.success && spyChartResult.data) {
      try {
        spyChartImage = await renderSpyChart(spyChartResult.data);
        console.log("[Orchestrator] SPY chart image rendered.");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("[Orchestrator] SPY chart rendering failed:", msg);
      }
    }

    // Send to Foundry for analysis
    let analysis: string | null = null;
    try {
      analysis = await this.foundryService.analyzePreMarketData(
        forexResult,
        fearGreedResult,
        earningsResult,
        spyChartResult,
      );
      console.log("[Orchestrator] Foundry analysis complete.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Orchestrator] Foundry analysis failed:", msg);
    }

    const briefing: PreMarketBriefing = {
      forexEvents: forexResult,
      fearGreed: fearGreedResult,
      earnings: earningsResult,
      spyChart: spyChartResult,
      spyChartImage,
      analysis,
      generatedAt: new Date().toISOString(),
    };

    // Send the briefing to all active subscribers
    try {
      const subscribers = await this.tableStorageService.listSubscriptionsByStatus("active");
      const recipients = subscribers.map((s) => s.rowKey);
      if (recipients.length > 0) {
        await this.emailService.sendPreMarketBriefing(briefing, recipients);
        console.log(`[Orchestrator] Briefing emailed to ${recipients.length} subscriber(s).`);
      } else {
        console.log("[Orchestrator] No active subscribers — skipping email.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Orchestrator] Failed to send briefing email:", msg);
    }

    return briefing;
  }
}
