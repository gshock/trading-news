import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { DefaultAzureCredential } from "@azure/identity";
import { AzureKeyCredential } from "@azure/core-auth";
import type { ForexEvent, FearGreedData, EarningsEvent, SpyChartData, OrbData, AgentResult } from "../agents/types.js";
import { PromptLoader } from "./promptLoader.js";

export class FoundryService {
  private client: ReturnType<typeof ModelClient> | null = null;
  private deploymentName: string = "";
  private promptLoader: PromptLoader;

  constructor() {
    this.promptLoader = new PromptLoader();
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

    const systemPrompt = this.promptLoader.load("premarket-system.md");

    const userPrompt = this.promptLoader.load("premarket-user.md", {
      TODAY: today,
      SPY_CHART: spyChartSection,
      FOREX_EVENTS: forexSection,
      FEAR_GREED: fearGreedSection,
      EARNINGS: earningsSection,
    });

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

    // Only include mid-cap and above ($2B+); filter out small-cap and unknown market caps
    const midCapAndAbove = result.data.filter((e) => this.parsedMarketCapBillions(e.marketCap) >= 2);

    if (!midCapAndAbove.length) {
      return "No mid-cap or larger earnings reports scheduled for today.";
    }

    // Show BMO first (most impactful pre-open), then AMC, then others
    const order: Record<string, number> = { BMO: 0, "During Market": 1, AMC: 2, Unknown: 3 };
    const sorted = [...midCapAndAbove].sort(
      (a, b) => (order[a.reportTime] ?? 3) - (order[b.reportTime] ?? 3),
    );

    return sorted
      .map((e) => {
        const parts = [`**${e.ticker}**`];
        if (e.company) parts.push(e.company);
        parts.push(`(${e.reportTime})`);
        if (e.marketCap) parts.push(`Cap: ${e.marketCap}`);
        if (e.epsEstimate) parts.push(`EPS Est: ${e.epsEstimate}`);
        if (e.revenueEstimate) parts.push(`Rev Est: ${e.revenueEstimate}`);
        return `- ${parts.join(" | ")}`;
      })
      .join("\n");
  }

  /**
   * Parses a Finviz market cap string (e.g. "12.5B", "450M", "2.1T") into billions.
   * Returns -1 if unparseable (treated as below any threshold).
   */
  private parsedMarketCapBillions(raw: string): number {
    if (!raw) return -1;
    const upper = raw.toUpperCase();
    // K or M = thousands/millions — always below $2B threshold, no need to parse
    if (upper.includes("K") || upper.includes("M")) return 0;
    // T = trillions — always above threshold
    if (upper.includes("T")) return 999_999;
    // B = billions — strip $ and commas, parse the number
    const match = /\$?([\d,]+\.?\d*)\s*B/i.exec(raw);
    if (!match) return -1;
    return parseFloat(match[1]!.replace(/,/g, ""));
  }

  // ─── ORB Analysis ────────────────────────────────────────────────────────

  /**
   * Generates an AI trading analysis for the ORB (Opening Range Breakout) email.
   *
   * @param orbData   Candle data for all sector ETFs collected at run time
   * @param forexResult  Today's high-impact USD economic events
   * @param runType   "945AM" = first candle only; "orbAgent" = both candles complete
   */
  async analyzeOrbData(
    orbData: OrbData[],
    forexResult: AgentResult<ForexEvent[]>,
    runType: "945AM" | "orbAgent",
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

    const isFirstCandleOnly = runType === "945AM";
    const candleContext = isFirstCandleOnly
      ? "The first 15-minute candle (9:30–9:45 AM ET) has just closed. The opening range is not yet complete."
      : "Both 15-minute opening range candles (9:30–9:45 AM and 9:45–10:00 AM ET) have closed. The opening range is complete.";

    const orbSection = this.formatOrbData(orbData);
    const forexSection = this.formatForexDataForOrb(forexResult, runType);

    const systemPrompt = this.promptLoader.load("orb-system.md");

    const userPromptFile = isFirstCandleOnly ? "orb-user-945am.md" : "orb-user-10am.md";
    const userPrompt = this.promptLoader.load(userPromptFile, {
      TODAY: today,
      CANDLE_CONTEXT: candleContext,
      ORB_DATA: orbSection,
      FOREX_DATA: forexSection,
    });

    const response = await this.client.path("/chat/completions").post({
      body: {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: this.deploymentName,
        temperature: 0.2,
        max_tokens: 1000,
      },
    });

    if (isUnexpected(response)) {
      throw new Error(`Foundry API error: ${response.status} — ${JSON.stringify(response.body)}`);
    }

    return response.body.choices[0]?.message?.content ?? "No analysis generated.";
  }

  private formatOrbData(orbData: OrbData[]): string {
    if (!orbData.length) return "No ORB data available.";

    return orbData
      .map((d) => {
        const orRange = (d.orHigh - d.orLow).toFixed(2);
        const pctFromPrevClose =
          d.previousClose && d.previousClose > 0
            ? (((d.current ?? d.orLow) - d.previousClose) / d.previousClose * 100).toFixed(2)
            : "N/A";
        const vsOrHigh =
          d.current !== null
            ? d.current >= d.orHigh
              ? `ABOVE OR High (+${(d.current - d.orHigh).toFixed(2)})`
              : `below OR High (-${(d.orHigh - d.current).toFixed(2)})`
            : "N/A";

        const candleLines = d.candles
          .map((c, i) => {
            const timeET = new Date(c.time * 1000).toLocaleTimeString("en-US", {
              timeZone: "America/New_York",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
            const body = (c.close - c.open).toFixed(2);
            const direction = c.close >= c.open ? "▲" : "▼";
            return `  Candle ${i + 1} (${timeET}): O=${c.open.toFixed(2)} H=${c.high.toFixed(2)} L=${c.low.toFixed(2)} C=${c.close.toFixed(2)} ${direction}${Math.abs(parseFloat(body)).toFixed(2)}`;
          })
          .join("\n");

        return [
          `### ${d.symbol}`,
          `  OR High: ${d.orHigh.toFixed(2)} | OR Low: ${d.orLow.toFixed(2)} | Range: ${orRange}`,
          `  Current: ${d.current?.toFixed(2) ?? "N/A"} | Prev Close: ${d.previousClose?.toFixed(2) ?? "N/A"} | vs Prev Close: ${pctFromPrevClose}%`,
          `  Price vs Range: ${vsOrHigh}`,
          candleLines,
        ].join("\n");
      })
      .join("\n\n");
  }

  private formatForexDataForOrb(
    result: AgentResult<ForexEvent[]>,
    runType: "945AM" | "orbAgent",
  ): string {
    if (!result.success || !result.data?.length) {
      return result.error
        ? `Data collection failed: ${result.error}`
        : "No high-impact USD events scheduled for today.";
    }

    // Cutoff times: 945AM run shows events at or before 9:45 AM; 10AM run at or before 10:00 AM
    const cutoffMinutes = runType === "945AM" ? 9 * 60 + 45 : 10 * 60 + 0;

    const parseMinutes = (timeStr: string): number => {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
      if (!match) return -1;
      let h = parseInt(match[1]!, 10);
      const m = parseInt(match[2]!, 10);
      const period = match[3]!.toLowerCase();
      if (period === "pm" && h !== 12) h += 12;
      if (period === "am" && h === 12) h = 0;
      return h * 60 + m;
    };

    const lines: string[] = [];
    for (const e of result.data) {
      const eventMinutes = parseMinutes(e.time);
      // Include event if: time is parseable and at/before cutoff, OR time is before market open (pre-open data)
      const isAtOrBeforeCutoff = eventMinutes !== -1 && eventMinutes <= cutoffMinutes;
      const isPreOpen = eventMinutes !== -1 && eventMinutes < 9 * 60 + 30;
      if (!isAtOrBeforeCutoff && !isPreOpen) continue;

      const status = e.actual
        ? `✓ Reported — Actual: ${e.actual} | Forecast: ${e.forecast || "N/A"} | Previous: ${e.previous || "N/A"}`
        : `Pending — Forecast: ${e.forecast || "N/A"} | Previous: ${e.previous || "N/A"}`;
      lines.push(`- **${e.time}** | ${e.event} | ${status}`);
    }

    return lines.length
      ? lines.join("\n")
      : "No high-impact USD events at or before this run's cutoff time.";
  }

  private formatSpyChartData(result: AgentResult<SpyChartData>): string {
    if (!result.success || !result.data) {
      return result.error
        ? `Data collection failed: ${result.error}`
        : "SPY chart data unavailable.";
    }

    const d = result.data;
    const direction = d.priceVsSma > 0 ? "above" : d.priceVsSma < 0 ? "below" : "at";

    const currentDateLabel = d.currentPriceDate
      ? new Date(d.currentPriceDate).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "America/New_York",
        })
      : "today";

    const lines = [
      `- **SPY Current Price** (${currentDateLabel}): $${d.latestClose.toFixed(2)}`,
      `- **Last Completed Weekly Close**: $${d.latestWeeklyClose.toFixed(2)}`,
      `- **20-Week SMA**: $${d.latestSma.toFixed(2)}`,
      `- **Position**: Price is **${direction}** the 20 SMA by $${Math.abs(d.priceVsSma).toFixed(2)} (${d.priceVsSmaPct > 0 ? "+" : ""}${d.priceVsSmaPct.toFixed(2)}%)`,
      `- **Interpretation**: SPY trading ${direction} the 20-week SMA is generally considered ${direction === "above" ? "bullish — the broader market trend is intact" : direction === "below" ? "bearish — the broader market is under pressure" : "neutral — the market is at a key inflection point"}`,
    ];

    // Daily breakdown for the last 2 weeks, with rolling SMA approximation
    if (d.recentDailyCandles.length > 0) {
      lines.push("");
      lines.push("**Recent Daily Closes & Rolling 20-Week SMA (Last 2 Weeks)**:");
      // recentDailyCandles[0] = today (most recent) — reverse to show oldest first
      const sortedDaily = [...d.recentDailyCandles].reverse();
      const sortedDailySma = [...d.recentDailySma].reverse();
      const todayTs = d.recentDailyCandles[0]?.time;
      sortedDaily.forEach((candle, i) => {
        const label = new Date(candle.time * 1000).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
        const isToday = candle.time === todayTs;
        const smaVal = sortedDailySma[i];
        const smaPart = smaVal != null ? ` | SMA≈$${smaVal.toFixed(2)}` : "";
        lines.push(
          `  - ${label}: $${candle.close.toFixed(2)}${smaPart}${isToday ? " ← current" : ""}`,
        );
      });
    }

    return lines.join("\n");
  }
}
