import TradingView from "@mathieuc/tradingview";
import type { SpyChartData, CandleData, AgentResult } from "./types.js";

export class SpyChartAgent {
  private readonly symbol = "AMEX:SPY";
  private readonly smaLength = 20;
  private readonly displayCandles = 52; // ~1 year of weekly candles for chart
  private readonly fetchWeeklyCount = 52 + 20; // extra for SMA warm-up
  private readonly fetchDailyCount = 20; // ~4 weeks of trading days

  async collect(): Promise<AgentResult<SpyChartData>> {
    try {
      // Fetch weekly and daily candles in parallel
      const [weeklyCandles, dailyCandles] = await Promise.all([
        this.fetchCandles("W", this.fetchWeeklyCount),
        this.fetchCandles("D", this.fetchDailyCount),
      ]);

      const smaValues = this.calculateSMA(weeklyCandles);

      // Trim to displayCandles (oldest were only for SMA warm-up)
      const allDisplayWeekly = weeklyCandles.slice(0, this.displayCandles);
      const allDisplaySma = smaValues.slice(0, this.displayCandles);

      // Latest SMA from the full weekly array (most recent computable)
      const latestSma = smaValues[0] ?? 0;

      // Cutoff: midnight UTC of the Monday that started last week
      const cutoffTs = this.getLastWeekMondayTimestamp();

      // Weekly chart candles: only those whose week started BEFORE last week
      const weeklyDisplayCandles = allDisplayWeekly.filter((c) => c.time < cutoffTs);
      const weeklyDisplaySma = allDisplaySma.filter(
        (_v: number | null, i: number) => (allDisplayWeekly[i]?.time ?? 0) < cutoffTs,
      );

      // Daily candles for last week + this week (index 0 = today)
      const recentDailyCandles = dailyCandles.filter((c) => c.time >= cutoffTs);

      // Rolling daily SMA: for each recent daily candle, average of the
      // 19 most-recent completed weekly closes + that day's close.
      const completedWeeklyCloses = weeklyCandles
        .slice(0, this.smaLength - 1)
        .map((c) => c.close);
      const recentDailySma: (number | null)[] = recentDailyCandles.map((daily) => {
        if (completedWeeklyCloses.length < this.smaLength - 1) return null;
        const sum =
          completedWeeklyCloses.reduce((acc, v) => acc + v, 0) + daily.close;
        return Math.round((sum / this.smaLength) * 100) / 100;
      });

      // Current price = most recent daily candle
      const currentDayCandle = recentDailyCandles[0] ?? dailyCandles[0];
      const currentPrice = currentDayCandle?.close ?? null;
      const currentPriceDate = currentDayCandle
        ? new Date(currentDayCandle.time * 1000).toISOString()
        : null;

      const latestClose = currentPrice ?? weeklyCandles[0]?.close ?? 0;
      const latestWeeklyClose =
        weeklyDisplayCandles.length > 0
          ? (weeklyDisplayCandles[0]?.close ?? 0)
          : (weeklyCandles[0]?.close ?? 0);

      if (latestClose === 0 || latestSma === 0) {
        throw new Error("No candle data returned from TradingView");
      }

      const priceVsSma: number = latestClose - latestSma;
      const priceVsSmaPct: number = (priceVsSma / latestSma) * 100;
      const position: SpyChartData["position"] =
        priceVsSmaPct > 1 ? "above" : priceVsSmaPct < -1 ? "below" : "at";

      return {
        agentName: "SpyChartAgent",
        success: true,
        data: {
          symbol: "SPY",
          timeframe: "Weekly",
          smaLength: this.smaLength,
          candles: weeklyDisplayCandles,
          sma: weeklyDisplaySma,
          recentDailyCandles,
          recentDailySma,
          latestClose,
          latestWeeklyClose,
          latestSma,
          currentPrice,
          currentPriceDate,
          priceVsSma,
          priceVsSmaPct,
          position,
          collectedAt: new Date().toISOString(),
        },
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("[SpyChartAgent] Error:", msg);
      return {
        agentName: "SpyChartAgent",
        success: false,
        data: null,
        error: msg,
        collectedAt: new Date().toISOString(),
      };
    }
  }

  private fetchCandles(timeframe: string, count: number): Promise<CandleData[]> {
    return new Promise((resolve, reject) => {
      const client = new TradingView.Client();
      const chart = new client.Session.Chart();

      const timeout = setTimeout(() => {
        client.end();
        reject(new Error(`TradingView ${timeframe} data fetch timed out after 30s`));
      }, 30_000);

      chart.setMarket(this.symbol, { timeframe, range: count });

      chart.onError((...args: unknown[]) => {
        clearTimeout(timeout);
        client.end();
        reject(new Error(`TradingView chart error: ${args.join(" ")}`));
      });

      let resolved = false;
      chart.onUpdate(() => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);

        const candles: CandleData[] = chart.periods.map(
          (p: {
            time: number;
            open: number;
            high?: number;
            max?: number;
            low?: number;
            min?: number;
            close: number;
            volume: number;
          }) => ({
            time: p.time,
            open: p.open,
            high: p.high ?? p.max ?? p.open,
            low: p.low ?? p.min ?? p.open,
            close: p.close,
            volume: p.volume,
          }),
        );

        client.end();
        resolve(candles);
      });
    });
  }

  /**
   * Returns the Unix timestamp (seconds) for Monday 00:00 UTC of last week.
   * This is the cutoff between historical weekly data and the recent daily data.
   */
  private getLastWeekMondayTimestamp(): number {
    const now = new Date();
    const dow = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const daysSinceMonday = dow === 0 ? 6 : dow - 1;

    const thisMonday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday),
    );

    const lastMonday = new Date(thisMonday);
    lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);

    return Math.floor(lastMonday.getTime() / 1000);
  }

  private calculateSMA(candles: CandleData[]): (number | null)[] {
    // candles[0] is the most recent. SMA at index i = average of close[i..i+length-1].
    return candles.map((_, i) => {
      if (i + this.smaLength > candles.length) return null;
      const slice = candles.slice(i, i + this.smaLength);
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      return Math.round((sum / this.smaLength) * 100) / 100;
    });
  }
}
