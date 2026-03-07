declare module "@mathieuc/tradingview" {
  interface ChartPeriod {
    time: number;
    open: number;
    close: number;
    high?: number;
    max?: number;
    low?: number;
    min?: number;
    volume: number;
  }

  interface MarketOptions {
    timeframe?: string;
    range?: number;
    to?: number;
  }

  interface Chart {
    periods: ChartPeriod[];
    setMarket(symbol: string, options?: MarketOptions): void;
    onUpdate(callback: () => void): void;
    onError(callback: (...args: unknown[]) => void): void;
  }

  interface Session {
    Chart: new () => Chart;
  }

  interface ClientSession {
    Chart: new () => Chart;
  }

  interface Client {
    Session: ClientSession;
    end(): void;
  }

  interface ClientConstructor {
    new (options?: { token?: string; signature?: string }): Client;
  }

  interface PineIndicator {
    pineId: string;
    pineVersion: string;
    description: string;
    shortDescription: string;
    inputs: Record<string, unknown>;
    plots: Record<string, string>;
    script: string;
    setOption(key: string, value: unknown): void;
  }

  interface TradingViewModule {
    Client: ClientConstructor;
    getIndicator(id: string, version?: string): Promise<PineIndicator>;
    searchIndicator(search: string): Promise<unknown[]>;
    searchMarket(search: string, filter?: string): Promise<unknown[]>;
    searchMarketV3(search: string, filter?: string, offset?: number): Promise<unknown[]>;
    getTA(id: string): Promise<unknown>;
  }

  const module: TradingViewModule;
  export default module;
}
