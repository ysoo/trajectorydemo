import type { Quote, HistoricalQuote } from "./types.js";

const SYMBOLS = ["MSFT", "NVDA", "TSLA", "PLTR", "ARKG"];

// Real market closing prices for reference (you can update these periodically)
const REFERENCE_PRICES: Record<string, number> = {
  MSFT: 384.52,
  NVDA: 892.87,
  TSLA: 248.91,
  PLTR: 26.84,
  ARKG: 18.34
};

// Market state tracking for realistic behavior
const marketState = new Map<string, { lastPrice: number; trend: number; volatility: number }>();

// Initialize market state
function initializeMarketState() {
  for (const symbol of SYMBOLS) {
    marketState.set(symbol, {
      lastPrice: REFERENCE_PRICES[symbol] || 100,
      trend: (Math.random() - 0.5) * 0.001, // Random initial trend
      volatility: getVolatilityForSymbol(symbol)
    });
  }
}

// Get realistic volatility based on symbol
function getVolatilityForSymbol(symbol: string): number {
  switch (symbol) {
    case "NVDA": return 0.025; // High volatility
    case "TSLA": return 0.030; // Very high volatility
    case "PLTR": return 0.028; // High growth stock volatility
    case "ARKG": return 0.022; // ETF volatility
    case "MSFT": return 0.015; // Lower volatility blue chip
    default: return 0.020;
  }
}

// Check if markets are likely open (rough approximation)
function isMarketHours(): boolean {
  const now = new Date();
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const est = new Date(utc.getTime() + (-5 * 3600000)); // EST/EDT approximation
  
  const hour = est.getHours();
  const dayOfWeek = est.getDay();
  
  // Weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  // Rough market hours (9:30 AM - 4:00 PM EST)
  return hour >= 9 && hour <= 16;
}

/** Generate realistic fallback quote when real data is unavailable */
export function generateFallbackQuote(symbol?: string): Quote {
  if (marketState.size === 0) {
    initializeMarketState();
  }
  
  const targetSymbol = symbol || SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const state = marketState.get(targetSymbol);
  
  if (!state) {
    // Fallback for unknown symbol
    const price = 100 + Math.random() * 100;
    return {
      symbol: targetSymbol,
      last: Math.round(price * 100) / 100,
      bid: Math.round((price - 0.05) * 100) / 100,
      ask: Math.round((price + 0.05) * 100) / 100,
      ts: Date.now(),
      volume: Math.floor(Math.random() * 1000000),
      change: Math.round((Math.random() - 0.5) * 10 * 100) / 100,
      changePercent: Math.round((Math.random() - 0.5) * 5 * 100) / 100
    };
  }
  
  // Simulate realistic price movement
  const isOpen = isMarketHours();
  const volatilityMultiplier = isOpen ? 1.0 : 0.1; // Much less movement when markets closed
  
  // Random walk with trend
  const change = (Math.random() - 0.5) * state.volatility * volatilityMultiplier;
  state.lastPrice = Math.max(0.01, state.lastPrice * (1 + change + state.trend));
  
  // Occasionally change trend
  if (Math.random() < 0.05) {
    state.trend = (Math.random() - 0.5) * 0.002;
  }
  
  const price = Math.round(state.lastPrice * 100) / 100;
  const spread = Math.max(0.01, price * 0.0005); // 0.05% spread
  
  const referencePrice = REFERENCE_PRICES[targetSymbol] || price;
  const dailyChange = price - referencePrice;
  const dailyChangePercent = (dailyChange / referencePrice) * 100;
  
  return {
    symbol: targetSymbol,
    last: price,
    bid: Math.round((price - spread) * 100) / 100,
    ask: Math.round((price + spread) * 100) / 100,
    ts: Date.now(),
    volume: Math.floor(Math.random() * 2000000) + 100000,
    change: Math.round(dailyChange * 100) / 100,
    changePercent: Math.round(dailyChangePercent * 100) / 100,
    high: Math.round((referencePrice * 1.05) * 100) / 100,
    low: Math.round((referencePrice * 0.95) * 100) / 100,
    open: referencePrice
  };
}

/** Generate historical fallback data for charts */
export function generateFallbackHistory(symbol: string, points: number = 78): HistoricalQuote[] {
  const history: HistoricalQuote[] = [];
  const now = Date.now();
  const interval = 5 * 60 * 1000; // 5 minutes
  
  const basePrice = REFERENCE_PRICES[symbol] || 100;
  const volatility = getVolatilityForSymbol(symbol);
  
  let price = basePrice * 0.98; // Start slightly lower
  
  for (let i = 0; i < points; i++) {
    const timestamp = now - (points - i) * interval;
    const date = new Date(timestamp);
    
    // Simulate intraday movement
    const change = (Math.random() - 0.5) * volatility;
    price = Math.max(0.01, price * (1 + change));
    
    // Add some trend toward current price
    const trendToTarget = (basePrice - price) * 0.001;
    price += trendToTarget;
    
    const open = i === 0 ? price : history[i - 1].close;
    const high = price * (1 + Math.random() * 0.005);
    const low = price * (1 - Math.random() * 0.005);
    const volume = Math.floor(Math.random() * 500000) + 50000;
    
    history.push({
      symbol: symbol.toUpperCase(),
      date: date.toISOString(),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(price * 100) / 100,
      volume,
      timestamp
    });
  }
  
  return history;
}

/** Get supported symbols */
export function getSupportedSymbols(): string[] {
  return [...SYMBOLS];
}

/** Legacy function for backward compatibility */
export function nextQuote(prev?: Quote): Quote {
  const symbol = prev?.symbol || SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  return generateFallbackQuote(symbol);
}
