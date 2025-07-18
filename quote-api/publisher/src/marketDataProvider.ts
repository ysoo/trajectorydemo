import yahooFinance from 'yahoo-finance2';
import type { Quote, HistoricalQuote, QuoteWithHistory, MarketDataCache } from './types.js';
import { generateFallbackQuote, generateFallbackHistory } from './quoteGenerator.js';

const SYMBOLS = ["MSFT", "NVDA", "TSLA", "PLTR", "ARKG", "SPY", "META", "GOOGL"];
const CACHE_TTL_MINUTES = 1; // Cache quotes for 1 minute
const HISTORY_CACHE_TTL_MINUTES = 15; // Cache historical data for 15 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class MarketDataProvider {
  private cache = new Map<string, MarketDataCache>();
  private lastSuccessfulFetch = 0;
  private consecutiveFailures = 0;
  private useFallbackMode = false;

  /**
   * Get real-time quote for a symbol with fallback
   */
  async getQuote(symbol: string): Promise<Quote | null> {
    // If we're in fallback mode or have too many failures, use fallback immediately
    if (this.useFallbackMode || this.consecutiveFailures >= MAX_RETRIES) {
      console.log(`Using fallback data for ${symbol} (mode: ${this.useFallbackMode ? 'fallback' : 'failures'})`);
      return generateFallbackQuote(symbol);
    }

    try {
      const result = await this.fetchWithRetry(() => yahooFinance.quote(symbol));
      
      if (!result || !result.regularMarketPrice) {
        console.warn(`No data available for symbol: ${symbol}, using fallback`);
        this.consecutiveFailures++;
        return generateFallbackQuote(symbol);
      }

      // Reset failure counter on success
      this.consecutiveFailures = 0;
      this.lastSuccessfulFetch = Date.now();

      const quote: Quote = {
        symbol: symbol.toUpperCase(),
        last: result.regularMarketPrice,
        bid: result.bid || result.regularMarketPrice - 0.01,
        ask: result.ask || result.regularMarketPrice + 0.01,
        ts: Date.now(),
        volume: result.regularMarketVolume,
        change: result.regularMarketChange,
        changePercent: result.regularMarketChangePercent,
        high: result.regularMarketDayHigh,
        low: result.regularMarketDayLow,
        open: result.regularMarketOpen
      };

      return quote;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, (error as Error).message);
      this.consecutiveFailures++;
      
      // If we haven't had a successful fetch in the last 10 minutes, enable fallback mode
      if (Date.now() - this.lastSuccessfulFetch > 10 * 60 * 1000) {
        this.useFallbackMode = true;
        console.log('Switching to fallback mode due to prolonged API failures');
      }
      
      return generateFallbackQuote(symbol);
    }
  }

  /**
   * Get historical data with fallback
   */
  async getHistoricalData(symbol: string): Promise<HistoricalQuote[]> {
    if (this.useFallbackMode || this.consecutiveFailures >= MAX_RETRIES) {
      console.log(`Using fallback historical data for ${symbol}`);
      return generateFallbackHistory(symbol);
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 2); // 2 days ago to get more data

      const result = await this.fetchWithRetry(() => 
        yahooFinance.historical(symbol, {
          period1: startDate,
          period2: endDate,
          interval: '1d' // Daily intervals (only supported option for historical)
        })
      );

      if (!result || result.length === 0) {
        console.warn(`No historical data for ${symbol}, using fallback`);
        return generateFallbackHistory(symbol);
      }

      return result.map((item: any) => ({
        symbol: symbol.toUpperCase(),
        date: item.date.toISOString(),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        timestamp: item.date.getTime()
      }));
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, (error as Error).message);
      return generateFallbackHistory(symbol);
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Get quote with history from cache or fetch fresh data
   */
  async getQuoteWithHistory(symbol: string): Promise<QuoteWithHistory | null> {
    const now = Date.now();
    const cached = this.cache.get(symbol);

    // Check if we have valid cached data
    if (cached && now < cached.expires) {
      return {
        current: cached.quote,
        history: cached.history
      };
    }

    // Fetch fresh data
    try {
      const [quote, history] = await Promise.all([
        this.getQuote(symbol),
        this.getHistoricalData(symbol)
      ]);

      if (!quote) {
        return null;
      }

      // Cache the data
      const cacheEntry: MarketDataCache = {
        quote,
        history,
        lastUpdated: now,
        expires: now + (CACHE_TTL_MINUTES * 60 * 1000)
      };

      this.cache.set(symbol, cacheEntry);

      return {
        current: quote,
        history
      };
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      
      // Try to return fallback data even on complete failure
      const fallbackQuote = generateFallbackQuote(symbol);
      const fallbackHistory = generateFallbackHistory(symbol);
      
      return {
        current: fallbackQuote,
        history: fallbackHistory
      };
    }
  }

  /**
   * Get quotes for all tracked symbols
   */
  async getAllQuotes(): Promise<Quote[]> {
    const quotes = await Promise.allSettled(
      SYMBOLS.map(symbol => this.getQuote(symbol))
    );

    return quotes
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<Quote>).value);
  }

  /**
   * Get a random quote from our tracked symbols (for background publishing)
   */
  async getRandomQuote(): Promise<Quote | null> {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    return this.getQuote(symbol);
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [symbol, cached] of this.cache.entries()) {
      if (now >= cached.expires) {
        this.cache.delete(symbol);
      }
    }
  }

  /**
   * Get supported symbols
   */
  getSupportedSymbols(): string[] {
    return [...SYMBOLS];
  }

  /**
   * Check if we're in fallback mode
   */
  isInFallbackMode(): boolean {
    return this.useFallbackMode;
  }

  /**
   * Force exit fallback mode (useful for testing connectivity)
   */
  exitFallbackMode(): void {
    this.useFallbackMode = false;
    this.consecutiveFailures = 0;
    console.log('Exited fallback mode, will attempt real API calls');
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      fallbackMode: this.useFallbackMode,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessfulFetch: this.lastSuccessfulFetch,
      cacheSize: this.cache.size,
      supportedSymbols: SYMBOLS.length
    };
  }
}

// Singleton instance
export const marketDataProvider = new MarketDataProvider();

// Clean up expired cache every 5 minutes
setInterval(() => {
  marketDataProvider.clearExpiredCache();
}, 5 * 60 * 1000);

// Periodically try to exit fallback mode if we've been in it for a while
setInterval(() => {
  if (marketDataProvider.isInFallbackMode()) {
    // Try to fetch a test quote to see if API is back online
    marketDataProvider.getQuote('MSFT').then(() => {
      console.log('API appears to be back online');
    }).catch(() => {
      // Still failing, stay in fallback mode
    });
  }
}, 15 * 60 * 1000); // Check every 15 minutes 