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
}

export interface NewsItem {
  id: string;
  headline: string;
  time: string;
  source: string;
}