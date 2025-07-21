import type { Quote, HistoricalQuote } from "./types.js";
import { isMarketHours } from "./utils.js";

const SYMBOLS = ["MSFT", "NVDA", "TSLA", "PLTR", "ARKG", "SPY", "META", "GOOGL"];

// Real market closing prices for reference (updated July 2025)
const REFERENCE_PRICES: Record<string, number> = {
  MSFT: 510.05,
  NVDA: 172.41,
  TSLA: 329.65,
  PLTR: 153.52,
  ARKG: 24.92,
  SPY: 627.58,   // S&P 500 ETF
  META: 704.28,  // Meta Platforms
  GOOGL: 185.06  // Alphabet Class A
};

// Market state tracking for realistic behavior
const marketState = new Map<string, { lastPrice: number; trend: number; volatility: number }>();

// Initialize market state
function initializeMarketState() {
  for (const symbol of SYMBOLS) {
    let initialTrend = (Math.random() - 0.5) * 0.001; // Random initial trend
    
    // Special case: ARKG should have a slightly negative bias but allow some positive trends
    if (symbol === "ARKG") {
      initialTrend = (Math.random() - 0.6) * 0.001; // Biased toward negative but can be positive
    }
    
    // Special case: MSFT should have a positive bias for increasing trend
    if (symbol === "MSFT") {
      initialTrend = Math.abs(initialTrend) + 0.0005; // Biased toward positive trends
    }
    
    marketState.set(symbol, {
      lastPrice: REFERENCE_PRICES[symbol] || 100,
      trend: initialTrend,
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
    case "SPY": return 0.012;  // Low volatility S&P 500 ETF
    case "META": return 0.024; // High volatility tech stock
    case "GOOGL": return 0.020; // Moderate volatility tech giant
    default: return 0.020;
  }
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
  
  // Special handling for ARKG to decline with bounce backs but never exceed starting price
  if (targetSymbol === "ARKG") {
    // Allow normal volatility but add a declining bias
    const change = (Math.random() - 0.5) * state.volatility * volatilityMultiplier;
    const declineBias = -0.0005; // Small consistent decline bias
    
    let newPrice = state.lastPrice * (1 + change + state.trend + declineBias);
    
    // Ensure price never goes above the reference starting price
    const maxPrice = REFERENCE_PRICES["ARKG"];
    if (newPrice > maxPrice) {
      newPrice = maxPrice - (Math.random() * 0.1); // Pull it back down with some randomness
    }
    
    // Ensure price never goes below $20 (support level)
    const minPrice = 20.0;
    if (newPrice < minPrice) {
      newPrice = minPrice + (Math.random() * 0.5); // Bounce back up with some randomness
    }
    
    state.lastPrice = Math.max(0.01, newPrice);
    
    // Occasionally adjust trend but keep it slightly negative on average
    if (Math.random() < 0.05) {
      state.trend = (Math.random() - 0.6) * 0.002; // Biased toward negative trends
    }
  } else if (targetSymbol === "MSFT") {
    // Special handling for MSFT to always increase but never exceed $530
    const change = Math.abs((Math.random() - 0.5) * state.volatility * volatilityMultiplier * 0.5); // Positive bias
    const increaseBias = 0.0003; // Small consistent increase bias
    
    let newPrice = state.lastPrice * (1 + change + Math.abs(state.trend) + increaseBias);
    
    // Ensure price never goes above $530
    const maxPrice = 530.0;
    if (newPrice > maxPrice) {
      newPrice = maxPrice - (Math.random() * 0.5); // Pull it back down with some randomness
    }
    
    // Ensure price never goes below the reference starting price
    const minPrice = REFERENCE_PRICES["MSFT"];
    if (newPrice < minPrice) {
      newPrice = minPrice + (Math.random() * 0.5); // Bounce back up with some randomness
    }
    
    state.lastPrice = Math.max(0.01, newPrice);
    
    // Occasionally adjust trend but keep it positive on average
    if (Math.random() < 0.05) {
      state.trend = (Math.random() + 0.2) * 0.002; // Biased toward positive trends
    }
  } else {
    // Random walk with trend for other stocks
    const change = (Math.random() - 0.5) * state.volatility * volatilityMultiplier;
    state.lastPrice = Math.max(0.01, state.lastPrice * (1 + change + state.trend));
    
    // Occasionally change trend for non-ARKG stocks
    if (Math.random() < 0.05) {
      state.trend = (Math.random() - 0.5) * 0.002;
    }
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
    
    // Special handling for ARKG to show declining pattern with bounce backs
    if (symbol === "ARKG") {
      // Allow some volatility with bounce backs but maintain overall decline
      const change = (Math.random() - 0.5) * volatility;
      const declineRate = 0.001; // Smaller decline rate to allow for bounces
      
      let newPrice = price * (1 + change - declineRate);
      
      // Ensure price never goes above the starting reference price
      const maxPrice = REFERENCE_PRICES["ARKG"];
      if (newPrice > maxPrice) {
        newPrice = maxPrice - (Math.random() * 0.5); // Pull it back down
      }
      
      // Ensure price never goes below $20 (support level)
      const minPrice = 20.0;
      if (newPrice < minPrice) {
        newPrice = minPrice + (Math.random() * 0.5); // Bounce back up
      }
      
      price = Math.max(0.01, newPrice);
    } else if (symbol === "MSFT") {
      // Special handling for MSFT to show increasing pattern with occasional pullbacks
      const change = Math.abs((Math.random() - 0.5) * volatility * 0.7); // Mostly positive changes
      const increaseRate = 0.0008; // Small increase rate to allow for growth
      
      let newPrice = price * (1 + change + increaseRate);
      
      // Ensure price never goes above $530
      const maxPrice = 530.0;
      if (newPrice > maxPrice) {
        newPrice = maxPrice - (Math.random() * 1.0); // Pull it back down
      }
      
      // Ensure price never goes below the starting reference price
      const minPrice = REFERENCE_PRICES["MSFT"];
      if (newPrice < minPrice) {
        newPrice = minPrice + (Math.random() * 1.0); // Bounce back up
      }
      
      price = Math.max(0.01, newPrice);
    } else {
      // Simulate intraday movement for other stocks
      const change = (Math.random() - 0.5) * volatility;
      price = Math.max(0.01, price * (1 + change));
      
      // Add some trend toward current price for other stocks
      const trendToTarget = (basePrice - price) * 0.001;
      price += trendToTarget;
    }
    
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
