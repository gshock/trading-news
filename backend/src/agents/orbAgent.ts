import TradingView from "@mathieuc/tradingview";
import type { CandleData, AgentResult, OrbData } from "./types.js";

/**
 * The 10 SPDR sector ETFs whose ORB images we generate.
 * All trade on NYSE Arca, which TradingView maps to the AMEX prefix.
 */
export const ORB_SYMBOLS = [
  "XLC",
  "XLE",
  "XLF",
  "XLI",
  "XLK",
  "XLP",
  "XLRE",
  "XLU",
  "XLV",
  "XLY",
] as const;

export type OrbSymbol = (typeof ORB_SYMBOLS)[number];

/**
 * Fetches the first two 15-minute candles of the current trading session for a
 * given sector ETF and returns the Opening Range data (OR high / OR low).
 */
export class OrbAgent {
  private readonly timeframe = "15";
  /** Fetch enough recent bars to cover today's session plus yesterday's close */
  private readonly fetchRange = 60;

  async collect(symbol: string, sessionDate?: string): Promise<AgentResult<OrbData>> {
    try {
      const tvSymbol = `AMEX:${symbol}`;

      // Determine target session date; defaults to today in ET
      const targetDate = sessionDate ?? new Date().toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });

      const { candles, previousClose } = await this.fetchCandles(tvSymbol, targetDate);

      // Sort ascending so index 0 is the oldest bar
      const sorted = [...candles].sort((a, b) => a.time - b.time);

      // Keep only bars from the target session at or after 9:30 AM ET
      const sessionCandles = sorted.filter((c) => {
        const d = new Date(c.time * 1000);
        const dateET = d.toLocaleDateString("en-CA", {
          timeZone: "America/New_York",
        });
        if (dateET !== targetDate) return false;

        const hhmm = d.toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        });
        return hhmm >= "09:30";
      });

      // ORB uses the first two 15-min candles (9:30–9:45 and 9:45–10:00)
      const orbCandles = sessionCandles.slice(0, 2);

      if (orbCandles.length === 0) {
        throw new Error(
          `No session candles found for ${symbol} on ${targetDate} — market may not be open yet`,
        );
      }

      const orHigh = Math.max(...orbCandles.map((c) => c.high));
      const orLow = Math.min(...orbCandles.map((c) => c.low));
      // "Current" is the close of the last available candle at collection time
      const lastCandle = orbCandles[orbCandles.length - 1];
      const current = lastCandle ? lastCandle.close : orbCandles[0]!.close;

      return {
        agentName: "OrbAgent",
        success: true,
        data: {
          symbol,
          sessionDate: targetDate,
          isToday: sessionDate === undefined,
          orHigh,
          orLow,
          current,
          previousClose,
          candles: orbCandles,
          collectedAt: new Date().toISOString(),
        },
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[OrbAgent] Error for ${symbol}:`, msg);
      return {
        agentName: "OrbAgent",
        success: false,
        data: null,
        error: msg,
        collectedAt: new Date().toISOString(),
      };
    }
  }

  private fetchCandles(
    tvSymbol: string,
    targetDate: string,
  ): Promise<{ candles: CandleData[]; previousClose: number | null }> {
    return new Promise((resolve, reject) => {
      const client = new TradingView.Client();
      const chart = new client.Session.Chart();

      const timeout = setTimeout(() => {
        client.end();
        reject(new Error(`TradingView timed out fetching ${tvSymbol}`));
      }, 30_000);

      chart.setMarket(tvSymbol, {
        timeframe: this.timeframe,
        range: this.fetchRange,
      });

      chart.onError((...args: unknown[]) => {
        clearTimeout(timeout);
        client.end();
        reject(
          new Error(`TradingView error for ${tvSymbol}: ${args.join(" ")}`),
        );
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

        // Previous close = last candle from a trading day before targetDate
        const prevDayCandles = candles.filter((c) => {
          const dateET = new Date(c.time * 1000).toLocaleDateString("en-CA", {
            timeZone: "America/New_York",
          });
          return dateET < targetDate;
        });
        const sortedPrev = [...prevDayCandles].sort((a, b) => b.time - a.time);
        const previousClose =
          sortedPrev.length > 0 && sortedPrev[0] !== undefined
            ? sortedPrev[0].close
            : null;

        client.end();
        resolve({ candles, previousClose });
      });
    });
  }
}
