import Redis from "ioredis";
import type { Quote, HistoricalQuote, QuoteWithHistory } from "./types.js";

const redisUrl = process.env.REDIS_CONNECTION_STRING || "redis://localhost:6379";

// Azure Redis specific configuration
const redisConfig = {
  connectTimeout: 60000,        // 60 seconds timeout
  lazyConnect: true,           
  retryDelayOnFailover: 100,   // Retry delay
  retryDelayOnClusterDown: 300,
  enableOfflineQueue: false,    // Don't queue commands when offline
  maxRetriesPerRequest: null,   // Don't limit retries
  // SSL configuration for Azure Redis
  tls: redisUrl.includes('ssl=true') ? {
    rejectUnauthorized: false,  // Required for Azure Redis
    servername: redisUrl.match(/@([^:]+)/)?.[1] || ''
  } : undefined,
  // Connection retry strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis connection retry ${times}, delay: ${delay}ms`);
    return delay;
  },
  // Connection event handlers
  reconnectOnError: (err: Error) => {
    const targetError = "READONLY";
    return err.message.includes(targetError);
  }
};

export const redis = new Redis(redisUrl, redisConfig);

// Add connection event listeners
redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('ready', () => {
  console.log('Redis ready for commands');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});

export async function publishQuote(q: Quote) {
  try {
    // Ensure connection is ready
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    
    // Store current quote with 60-second TTL for REST API lookups
    await redis.set(`quote:${q.symbol}`, JSON.stringify(q), "EX", 60);
    
    // Publish to subscribers for real-time updates
    await redis.publish("quotes", JSON.stringify(q));
  } catch (error) {
    console.error('Failed to publish quote:', error);
    throw error;
  }
}

export async function cacheHistoricalData(symbol: string, history: HistoricalQuote[]) {
  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    
    // Cache historical data with 15-minute TTL
    await redis.set(
      `history:${symbol}`,
      JSON.stringify(history),
      "EX",
      15 * 60 // 15 minutes
    );
  } catch (error) {
    console.error(`Failed to cache historical data for ${symbol}:`, error);
    throw error;
  }
}

export async function getHistoricalData(symbol: string): Promise<HistoricalQuote[] | null> {
  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    
    const cached = await redis.get(`history:${symbol}`);
    if (!cached) {
      return null;
    }
    
    return JSON.parse(cached) as HistoricalQuote[];
  } catch (error) {
    console.error(`Failed to get historical data for ${symbol}:`, error);
    return null;
  }
}

export async function cacheQuoteWithHistory(symbol: string, data: QuoteWithHistory) {
  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    
    // Cache the combined data with 5-minute TTL
    await redis.set(
      `quote_history:${symbol}`,
      JSON.stringify(data),
      "EX",
      5 * 60 // 5 minutes
    );
  } catch (error) {
    console.error(`Failed to cache quote with history for ${symbol}:`, error);
    throw error;
  }
}

export async function getQuoteWithHistory(symbol: string): Promise<QuoteWithHistory | null> {
  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    
    const cached = await redis.get(`quote_history:${symbol}`);
    if (!cached) {
      return null;
    }
    
    return JSON.parse(cached) as QuoteWithHistory;
  } catch (error) {
    console.error(`Failed to get quote with history for ${symbol}:`, error);
    return null;
  }
}

export async function subscribeToQuotes(onQuote: (quote: Quote) => void): Promise<Redis> {
  const subscriber = new Redis(redisUrl, redisConfig);
  
  subscriber.on("message", (channel, message) => {
    if (channel === "quotes") {
      try {
        const quote: Quote = JSON.parse(message);
        onQuote(quote);
      } catch (error) {
        console.error("Failed to parse quote message:", error);
      }
    }
  });

  subscriber.on('error', (err) => {
    console.error('Redis subscriber error:', err.message);
  });

  try {
    await subscriber.subscribe("quotes");
    console.log('Successfully subscribed to quotes channel');
  } catch (error) {
    console.error('Failed to subscribe to quotes channel:', error);
    throw error;
  }
  
  return subscriber;
}

// Cache management utilities
export async function clearExpiredCache(): Promise<void> {
  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    
    // Redis automatically handles TTL expiration, but we can manually clean up if needed
    const keys = await redis.keys('quote:*');
    const expiredKeys = [];
    
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -2) { // Key doesn't exist
        expiredKeys.push(key);
      }
    }
    
    if (expiredKeys.length > 0) {
      await redis.del(...expiredKeys);
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  } catch (error) {
    console.error('Failed to clear expired cache:', error);
  }
}
