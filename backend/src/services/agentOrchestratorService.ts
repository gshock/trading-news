import { ForexFactoryAgent } from "../agents/forexFactoryAgent.js";
import { FearGreedAgent } from "../agents/fearGreedAgent.js";
import { FoundryService } from "./foundryService.js";
import type { PreMarketBriefing } from "../agents/types.js";

export class AgentOrchestratorService {
  private forexAgent: ForexFactoryAgent;
  private fearGreedAgent: FearGreedAgent;
  private foundryService: FoundryService;

  constructor() {
    this.forexAgent = new ForexFactoryAgent();
    this.fearGreedAgent = new FearGreedAgent();
    this.foundryService = new FoundryService();
  }

  /**
   * Runs both agents in parallel, then sends results to Foundry for analysis.
   */
  async runPreMarketBriefing(): Promise<PreMarketBriefing> {
    console.log("[Orchestrator] Starting pre-market briefing...");
    const startTime = Date.now();

    // Run both agents concurrently
    const [forexResult, fearGreedResult] = await Promise.all([
      this.forexAgent.collect(),
      this.fearGreedAgent.collect(),
    ]);

    console.log(
      `[Orchestrator] Agents completed in ${Date.now() - startTime}ms`,
      `| Forex: ${forexResult.success ? `${forexResult.data?.length ?? 0} events` : "FAILED"}`,
      `| Fear&Greed: ${fearGreedResult.success ? `Score ${fearGreedResult.data?.score}` : "FAILED"}`,
    );

    // Send to Foundry for analysis
    let analysis: string | null = null;
    try {
      analysis = await this.foundryService.analyzePreMarketData(
        forexResult,
        fearGreedResult,
      );
      console.log("[Orchestrator] Foundry analysis complete.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Orchestrator] Foundry analysis failed:", msg);
    }

    return {
      forexEvents: forexResult,
      fearGreed: fearGreedResult,
      analysis,
      generatedAt: new Date().toISOString(),
    };
  }
}
