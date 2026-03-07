import TradingView from "@mathieuc/tradingview";
import type { SpyChartData, CandleData, AgentResult } from "./types.js";

export class SpyChartAgent {
  private readonly symbol = "AMEX:SPY";
  private readonly timeframe = "W"; // Weekly
  private readonly smaLength = 20;
  // Fetch extra candles so we have enough history to compute SMA(20) for the display range
  private readonly displayCandles = 52; // ~1 year of weekly candles
  private readonly fetchCandles = 52 + 20; // extra for SMA warm-up

  async collect(): Promise<AgentResult<SpyChartData>> {
    try {
      const candles = await this.fetchCandles_();
      const smaValues = this.calculateSMA(candles);

      // Trim to displayCandles (the oldest ones were only for SMA warm-up)
      const displayCandles = candles.slice(0, this.displayCandles);
      const displaySma = smaValues.slice(0, this.displayCandles);

      const latest = displayCandles[0];
      const latestSma = displaySma[0];

      if (!latest || latestSma === undefined || latestSma === null) {
        throw new Error("No candle data returned from TradingView");
      }

      const priceVsSma: number = latest.close - latestSma;
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
          candles: displayCandles,
          sma: displaySma,
          latestClose: latest.close,
          latestSma: latestSma,
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

  private fetchCandles_(): Promise<CandleData[]> {
    return new Promise((resolve, reject) => {
      const client = new TradingView.Client();
      const chart = new client.Session.Chart();

      const timeout = setTimeout(() => {
        client.end();
        reject(new Error("TradingView data fetch timed out after 30s"));
      }, 30_000);

      chart.setMarket(this.symbol, {
        timeframe: this.timeframe,
        range: this.fetchCandles,
      });

      chart.onError((...args: unknown[]) => {
        clearTimeout(timeout);
        client.end();
        reject(new Error(`TradingView chart error: ${args.join(" ")}`));
      });

      let resolved = false;
      chart.onUpdate(() => {
        // onUpdate may fire multiple times; only resolve once
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);

        const candles: CandleData[] = chart.periods.map(
          (p: { time: number; open: number; high?: number; max?: number; low?: number; min?: number; close: number; volume: number }) => ({
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
