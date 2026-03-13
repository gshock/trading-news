export interface ForexEvent {
  time: string;
  currency: string;
  impact: "high" | "medium" | "low";
  event: string;
  actual: string;
  forecast: string;
  previous: string;
}

export interface FearGreedData {
  score: number;
  label: string;
  previousClose: { score: number; label: string };
  oneWeekAgo: { score: number; label: string };
  oneMonthAgo: { score: number; label: string };
  oneYearAgo: { score: number; label: string };
  timestamp: string;
}

export interface EarningsEvent {
  ticker: string;
  company: string;
  reportTime: "BMO" | "AMC" | "During Market" | "Unknown";
  marketCap: string;
  epsEstimate: string;
  revenueEstimate: string;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SpyChartData {
  symbol: string;
  timeframe: string;
  smaLength: number;
  /** Weekly candles for historical display (before last week), index 0 = most recent shown */
  candles: CandleData[];
  /** 20-week SMA values aligned with `candles` */
  sma: (number | null)[];
  /** Daily candles covering last week + this week, index 0 = today (most recent) */
  recentDailyCandles: CandleData[];
  /**
   * Rolling 20-week SMA approximation for each recent daily candle.
   * Computed as: average of (19 most-recent completed weekly closes + that day's close).
   * Aligned with `recentDailyCandles`, index 0 = today.
   */
  recentDailySma: (number | null)[];
  /** Most recent daily close / current intraday price */
  latestClose: number;
  /** Last fully-completed weekly close */
  latestWeeklyClose: number;
  /** 20-week SMA at the most recent weekly close */
  latestSma: number;
  /** Alias for latestClose — today's current price from the daily candle */
  currentPrice: number | null;
  /** ISO date string of the current-price candle */
  currentPriceDate: string | null;
  priceVsSma: number;
  priceVsSmaPct: number;
  position: "above" | "below" | "at";
  collectedAt: string;
}

export interface AgentResult<T> {
  agentName: string;
  success: boolean;
  data: T | null;
  error?: string;
  collectedAt: string;
}

export interface PreMarketBriefing {
  forexEvents: AgentResult<ForexEvent[]>;
  fearGreed: AgentResult<FearGreedData>;
  earnings: AgentResult<EarningsEvent[]>;
  spyChart: AgentResult<SpyChartData>;
  spyChartImage: Buffer | null;
  analysis: string | null;
  generatedAt: string;
}

export interface OrbData {
  symbol: string;
  /** YYYY-MM-DD in ET timezone */
  sessionDate: string;
  isToday: boolean;
  /** Opening range high = max high of first two 15-min candles */
  orHigh: number;
  /** Opening range low = min low of first two 15-min candles */
  orLow: number;
  /** Last close price available at collection time */
  current: number | null;
  /** Previous trading day's closing price */
  previousClose: number | null;
  /** First two 15-min candles sorted ascending by time */
  candles: CandleData[];
  collectedAt: string;
}
