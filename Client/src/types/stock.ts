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