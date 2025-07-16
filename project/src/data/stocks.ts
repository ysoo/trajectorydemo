import { Stock, NewsItem } from '../types/stock';

export const initialStocks: Stock[] = [
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 384.52,
    change: 12.34,
    changePercent: 3.32,
    volume: '23.4M',
    marketCap: '2.85T',
    high: 386.95,
    low: 378.21,
    open: 380.15
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 892.87,
    change: 45.67,
    changePercent: 5.39,
    volume: '41.2M',
    marketCap: '2.21T',
    high: 895.33,
    low: 867.45,
    open: 875.20
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 248.91,
    change: -8.42,
    changePercent: -3.27,
    volume: '87.6M',
    marketCap: '792.3B',
    high: 255.73,
    low: 246.12,
    open: 252.45
  },
  {
    symbol: 'PLTR',
    name: 'Palantir Technologies',
    price: 26.84,
    change: 1.23,
    changePercent: 4.80,
    volume: '52.1M',
    marketCap: '58.2B',
    high: 27.15,
    low: 25.67,
    open: 26.01
  },
  {
    symbol: 'ARKG',
    name: 'ARK Genomic Revolution ETF',
    price: 18.34,
    change: -2.67,
    changePercent: -12.71,
    volume: '3.8M',
    marketCap: '1.2B',
    high: 19.45,
    low: 18.12,
    open: 20.15
  }
];

export const newsItems: NewsItem[] = [
  {
    id: '1',
    headline: 'NVIDIA Reports Record Q4 Revenue Driven by AI Demand',
    time: '09:42:15',
    source: 'REUTERS'
  },
  {
    id: '2',
    headline: 'Microsoft Azure Cloud Revenue Surges 28% Year-over-Year',
    time: '09:38:22',
    source: 'BLOOMBERG'
  },
  {
    id: '3',
    headline: 'Tesla Cybertruck Production Ramps Up Ahead of Schedule',
    time: '09:35:47',
    source: 'WSJ'
  },
  {
    id: '4',
    headline: 'Palantir Wins Major Government Contract Worth $250M',
    time: '09:31:12',
    source: 'CNBC'
  },
  {
    id: '5',
    headline: 'ARK Invest Faces Continued Outflows Amid Tech Selloff',
    time: '09:28:33',
    source: 'FINANCIAL TIMES'
  }
];