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
  expectedMove: string;
  impliedMove: string;
  historicalMove: string;
  marketCap: string;
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
  candles: CandleData[];
  sma: (number | null)[];
  latestClose: number;
  latestSma: number;
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
