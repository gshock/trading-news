import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { DefaultAzureCredential } from "@azure/identity";
import { AzureKeyCredential } from "@azure/core-auth";
import type { ForexEvent, FearGreedData, EarningsEvent, SpyChartData, AgentResult } from "../agents/types.js";

export class FoundryService {
  private client: ReturnType<typeof ModelClient> | null = null;
  private deploymentName: string = "";

  constructor() {
    const endpoint = process.env.FOUNDRY_PROJECT_ENDPOINT;
    const deployment = process.env.FOUNDRY_MODEL_DEPLOYMENT_NAME;
    const apiKey = process.env.FOUNDRY_API_KEY;

    if (!endpoint || !deployment) {
      console.warn(
        "[FoundryService] FOUNDRY_PROJECT_ENDPOINT and FOUNDRY_MODEL_DEPLOYMENT_NAME are not set. " +
        "AI analysis will be replaced with a placeholder.",
      );
      return;
    }

    this.deploymentName = deployment;

    // Prefer an explicit API key (FOUNDRY_API_KEY) stored in .env.
    // Fall back to DefaultAzureCredential (requires `az login` locally
    // or a Managed Identity / Service Principal in production).
    const credential = apiKey
      ? new AzureKeyCredential(apiKey)
      : new DefaultAzureCredential();

    // @azure-rest/ai-inference needs the AI Services multi-model endpoint:
    //   https://{resource}.services.ai.azure.com/models
    // If the user stored the project-scoped endpoint
    //   https://{resource}.services.ai.azure.com/api/projects/{project}
    // we normalise it automatically so no .env change is required.
    const inferenceEndpoint = FoundryService.toInferenceEndpoint(endpoint);

    this.client = ModelClient(inferenceEndpoint, credential);
  }

  private static toInferenceEndpoint(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      if (url.hostname.endsWith(".services.ai.azure.com")) {
        return `${url.origin}/models`;
      }
    } catch {
      // not a valid URL — fall through and let the SDK surface its own error
    }
    return endpoint;
  }

  async analyzePreMarketData(
    forexResult: AgentResult<ForexEvent[]>,
    fearGreedResult: AgentResult<FearGreedData>,
    earningsResult: AgentResult<EarningsEvent[]>,
    spyChartResult: AgentResult<SpyChartData>,
  ): Promise<string> {
    if (!this.client) {
      return (
        "**AI Analysis Unavailable** — Azure AI Foundry keys are not configured in this environment. " +
        "Set `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_MODEL_DEPLOYMENT_NAME` in your `.env` file to enable AI-generated analysis."
      );
    }

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/New_York",
    });

    const forexSection = this.formatForexData(forexResult);
    const fearGreedSection = this.formatFearGreedData(fearGreedResult);
    const earningsSection = this.formatEarningsData(earningsResult);
    const spyChartSection = this.formatSpyChartData(spyChartResult);

    const systemPrompt = `You are an expert financial market analyst preparing a concise pre-market briefing for active traders. 
Your analysis should be actionable, data-driven, and focused on how today's events may impact US equity and forex markets.
Be direct and use bullet points for key takeaways. Include risk assessment.`;

    const userPrompt = `Today is ${today}. The US stock market opens at 9:30 AM EST.

Here is the pre-market data collected this morning:

## SPY Weekly Chart — Price vs 20 SMA
${spyChartSection}

## High-Impact USD Economic Events (from Forex Factory)
${forexSection}

## CNN Fear & Greed Index
${fearGreedSection}

## Upcoming Earnings Reports (from Market Chameleon)
${earningsSection}

Please provide:
1. **Market Structure** — Where is SPY relative to the 20-week SMA? Is the broader market trend bullish, bearish, or transitioning?
2. **Market Sentiment Summary** — Overall mood based on Fear & Greed + scheduled events
3. **Key Events to Watch** — Which events could move markets the most and expected impact
4. **Earnings to Watch** — Highlight the most market-moving earnings reports (BMO reports especially), expected volatility, and sector implications
5. **Trading Considerations** — Specific sectors/instruments likely affected, suggested caution levels
6. **Risk Assessment** — Rate today's risk level (Low / Moderate / High / Extreme) with reasoning`;

    const response = await this.client.path("/chat/completions").post({
      body: {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: this.deploymentName,
        temperature: 0.3,
        max_tokens: 1500,
      },
    });

    if (isUnexpected(response)) {
      throw new Error(`Foundry API error: ${response.status} — ${JSON.stringify(response.body)}`);
    }

    return response.body.choices[0]?.message?.content ?? "No analysis generated.";
  }

  private formatForexData(result: AgentResult<ForexEvent[]>): string {
    if (!result.success || !result.data?.length) {
      return result.error
        ? `Data collection failed: ${result.error}`
        : "No high-impact USD events scheduled for today.";
    }

    return result.data
      .map(
        (e) =>
          `- **${e.time}** | ${e.event} | Forecast: ${e.forecast || "N/A"} | Previous: ${e.previous || "N/A"}${e.actual ? ` | Actual: ${e.actual}` : ""}`,
      )
      .join("\n");
  }

  private formatFearGreedData(result: AgentResult<FearGreedData>): string {
    if (!result.success || !result.data) {
      return result.error
        ? `Data collection failed: ${result.error}`
        : "Fear & Greed data unavailable.";
    }

    const d = result.data;
    return [
      `- **Current Score**: ${d.score} (${d.label})`,
      `- Previous Close: ${d.previousClose.score} (${d.previousClose.label})`,
      `- 1 Week Ago: ${d.oneWeekAgo.score} (${d.oneWeekAgo.label})`,
      `- 1 Month Ago: ${d.oneMonthAgo.score} (${d.oneMonthAgo.label})`,
      `- 1 Year Ago: ${d.oneYearAgo.score} (${d.oneYearAgo.label})`,
    ].join("\n");
  }

  private formatEarningsData(result: AgentResult<EarningsEvent[]>): string {
    if (!result.success || !result.data?.length) {
      return result.error
        ? `Data collection failed: ${result.error}`
        : "No earnings reports scheduled for today.";
    }

    // Show BMO first (most impactful pre-open), then AMC, then others
    const order: Record<string, number> = { BMO: 0, "During Market": 1, AMC: 2, Unknown: 3 };
    const sorted = [...result.data].sort(
      (a, b) => (order[a.reportTime] ?? 3) - (order[b.reportTime] ?? 3),
    );

    return sorted
      .map((e) => {
        const parts = [`**${e.ticker}**`];
        if (e.company) parts.push(e.company);
        parts.push(`(${e.reportTime})`);
        if (e.marketCap) parts.push(`Cap: ${e.marketCap}`);
        if (e.expectedMove) parts.push(`Expected move: ${e.expectedMove}`);
        if (e.impliedMove) parts.push(`IV move: ${e.impliedMove}`);
        return `- ${parts.join(" | ")}`;
      })
      .join("\n");
  }

  private formatSpyChartData(result: AgentResult<SpyChartData>): string {
    if (!result.success || !result.data) {
      return result.error
        ? `Data collection failed: ${result.error}`
        : "SPY chart data unavailable.";
    }

    const d = result.data;
    const direction = d.priceVsSma > 0 ? "above" : d.priceVsSma < 0 ? "below" : "at";
    return [
      `- **SPY Latest Close**: $${d.latestClose.toFixed(2)}`,
      `- **20-Week SMA**: $${d.latestSma.toFixed(2)}`,
      `- **Position**: Price is **${direction}** the 20 SMA by $${Math.abs(d.priceVsSma).toFixed(2)} (${d.priceVsSmaPct > 0 ? "+" : ""}${d.priceVsSmaPct.toFixed(2)}%)`,
      `- **Interpretation**: SPY trading ${direction} the 20-week SMA is generally considered ${direction === "above" ? "bullish — the broader market trend is intact" : direction === "below" ? "bearish — the broader market is under pressure" : "neutral — the market is at a key inflection point"}`,
    ].join("\n");
  }
}
