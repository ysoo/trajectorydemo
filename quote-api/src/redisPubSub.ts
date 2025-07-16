import Redis from "ioredis";
import type { Quote } from "./types";

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
    
    // Store in cache with 2-second TTL for ultra-fast lookups
    await redis.set(`quote:${q.symbol}`, JSON.stringify(q), "EX", 2);
    
    // Publish to subscribers
    await redis.publish("quotes", JSON.stringify(q));
  } catch (error) {
    console.error('Failed to publish quote:', error);
    throw error;
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
