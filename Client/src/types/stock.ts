// UI Types for display components
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  high: number;
  low: number;
  open: number;
  history?: PricePoint[];
}

export interface PricePoint {
  time: string;
  price: number;
  timestamp: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  time: string;
  source: string;
}

// API Response Types (matching Quote API format)
export interface QuoteApiResponse {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  ts: number;
  volume?: number;
  change?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  open?: number;
}

export interface HistoricalQuoteApiResponse {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface QuoteWithHistoryApiResponse {
  current: QuoteApiResponse;
  history: HistoricalQuoteApiResponse[];
}

export interface ApiStatusResponse {
  fallbackMode: boolean;
  consecutiveFailures: number;
  dataSource: string;
  lastSuccessfulFetchAgo: number | null;
  recommendation: string;
  cacheSize: number;
  supportedSymbols: number;
}

// WebSocket message type
export interface WebSocketQuoteMessage extends QuoteApiResponse {}

// Stock metadata for company names and market caps
export interface StockMetadata {
  symbol: string;
  name: string;
  marketCap: string;
}

// Connection status for monitoring
export interface ConnectionStatus {
  connected: boolean;
  reconnectAttempts: number;
  lastError?: string;
  dataSource: 'api' | 'websocket' | 'fallback';
}