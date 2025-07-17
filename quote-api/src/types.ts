export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  ts: number;
  volume?: number;
  change?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  open?: number;
}

export interface HistoricalQuote {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface QuoteWithHistory {
  current: Quote;
  history: HistoricalQuote[];
}

export interface MarketDataCache {
  quote: Quote;
  history: HistoricalQuote[];
  lastUpdated: number;
  expires: number;
} 