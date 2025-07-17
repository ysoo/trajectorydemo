import { Stock, NewsItem, PricePoint } from '../types/stock';

// Generate historical price data for a stock
const generateHistory = (currentPrice: number, symbol: string, points: number = 30): PricePoint[] => {
  const history: PricePoint[] = [];
  const now = Date.now();
  const interval = 2000; // 2 seconds between points
  
  let price = currentPrice * 0.95; // Start 5% lower
  
  for (let i = 0; i < points; i++) {
    const timestamp = now - (points - i) * interval;
    const time = new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
    
    // Different volatility patterns for different stocks
    let volatility = 0.002; // Default 0.2%
    let trend = 0;
    
    switch (symbol) {
      case 'NVDA':
        volatility = 0.004; // More volatile
        trend = 0.001; // Upward trend
        break;
      case 'TSLA':
        volatility = 0.005; // Very volatile
        trend = -0.0005; // Slight downward trend
        break;
      case 'ARKG':
        volatility = 0.003;
        trend = -0.002; // Strong downward trend
        break;
      case 'PLTR':
        volatility = 0.0035;
        trend = 0.0008; // Upward trend
        break;
      case 'MSFT':
        volatility = 0.0025; // More stable
        trend = 0.0005; // Steady upward
        break;
    }
    
    // Random walk with trend
    const change = (Math.random() - 0.5) * volatility + trend;
    price = Math.max(0.01, price * (1 + change));
    
    history.push({
      time,
      price: Math.round(price * 100) / 100,
      timestamp
    });
  }
  
  return history;
};

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
    open: 380.15,
    history: generateHistory(384.52, 'MSFT')
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
    open: 875.20,
    history: generateHistory(892.87, 'NVDA')
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
    open: 252.45,
    history: generateHistory(248.91, 'TSLA')
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
    open: 26.01,
    history: generateHistory(26.84, 'PLTR')
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
    open: 20.15,
    history: generateHistory(18.34, 'ARKG')
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