import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import { marketDataProvider } from "./marketDataProvider.js";
import { 
  redis, 
  subscribeToQuotes, 
  cacheHistoricalData,
  getHistoricalData,
  cacheQuoteWithHistory,
  getQuoteWithHistory,
  clearExpiredCache
} from "./redisSub.js";
import type { Quote } from "./types.js";

const PORT = process.env.PORT ? +process.env.PORT : 8080;
const TICK_MS = parseInt(process.env.TICK_MS || "5000"); // 5 seconds for real data (less frequent)

const app = Fastify({ logger: true });

// Register CORS plugin to allow cross-origin requests
await app.register(cors, {
  // Allow all origins in development, specific origins in production
  origin: process.env.NODE_ENV === 'production' 
    ? [
        /^https?:\/\/.*\.azurewebsites\.net$/,  // Azure Web Apps
        /^https?:\/\/.*\.azurecontainer\.io$/,  // Azure Container Instances
        /^https?:\/\/localhost(:\d+)?$/,        // Local development
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/,     // Local development
        /^http?:\/\/52\.158\.166\.7(:\d+)?$/,     // Frontend server IP
      ]
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

await app.register(websocket);

// REST endpoint - Get current quote
app.get("/v1/quotes", async (req, res) => {
  const { symbol } = req.query as { symbol: string };
  
  if (!symbol) {
    return res.status(400).send({ message: "symbol parameter is required" });
  }
  
  // Try Redis cache first
  const cached = await redis.get(`quote:${symbol.toUpperCase()}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch fresh data if not in cache
  const quote = await marketDataProvider.getQuote(symbol.toUpperCase());
  if (!quote) {
    return res.status(404).send({ message: "quote not available" });
  }
  
  return quote;
});

// REST endpoint - Get quote with historical data
app.get("/v1/quotes/:symbol/history", async (req, res) => {
  const { symbol } = req.params as { symbol: string };
  
  if (!symbol) {
    return res.status(400).send({ message: "symbol parameter is required" });
  }
  
  const symbolUpper = symbol.toUpperCase();
  
  // Check Redis cache first
  const cached = await getQuoteWithHistory(symbolUpper);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await marketDataProvider.getQuoteWithHistory(symbolUpper);
  if (!data) {
    return res.status(404).send({ message: "data not available for symbol" });
  }
  
  // Cache the combined data
  await cacheQuoteWithHistory(symbolUpper, data);
  await cacheHistoricalData(symbolUpper, data.history);
  
  return data;
});

// REST endpoint - Get only historical data
app.get("/v1/history/:symbol", async (req, res) => {
  const { symbol } = req.params as { symbol: string };
  
  if (!symbol) {
    return res.status(400).send({ message: "symbol parameter is required" });
  }
  
  const symbolUpper = symbol.toUpperCase();
  
  // Check cache first
  const cached = await getHistoricalData(symbolUpper);
  if (cached) {
    return { symbol: symbolUpper, history: cached };
  }
  
  // Fetch fresh historical data
  const history = await marketDataProvider.getHistoricalData(symbolUpper);
  if (history.length === 0) {
    return res.status(404).send({ message: "historical data not available" });
  }
  
  // Cache the data
  await cacheHistoricalData(symbolUpper, history);
  
  return { symbol: symbolUpper, history };
});

// REST endpoint - Get all supported symbols
app.get("/v1/symbols", async (req, res) => {
  return {
    symbols: marketDataProvider.getSupportedSymbols(),
    count: marketDataProvider.getSupportedSymbols().length
  };
});

// REST endpoint - Get market data provider status
app.get("/v1/status", async (req, res) => {
  const providerStatus = marketDataProvider.getStatus();
  
  return {
    ...providerStatus,
    dataSource: providerStatus.fallbackMode ? "simulated" : "yahoo-finance",
    lastSuccessfulFetchAgo: providerStatus.lastSuccessfulFetch 
      ? Date.now() - providerStatus.lastSuccessfulFetch 
      : null,
    recommendation: providerStatus.fallbackMode 
      ? "Using simulated data. Check network connectivity or try again later." 
      : "Real market data available.",
    endpoints: {
      currentQuote: "/v1/quotes?symbol=MSFT",
      historicalData: "/v1/history/MSFT", 
      quoteWithHistory: "/v1/quotes/MSFT/history",
      symbols: "/v1/symbols",
      health: "/health"
    }
  };
});

// WebSocket streaming - subscribe to Redis pub/sub for real-time quotes
app.get("/ws", { websocket: true }, async (conn) => {
  const subscriber = await subscribeToQuotes((quote: Quote) => {
    if (conn.socket.readyState === conn.socket.OPEN) {
      conn.socket.send(JSON.stringify(quote));
    }
  });

  conn.socket.on("close", () => {
    subscriber.disconnect();
  });

  conn.socket.on("error", (err: Error) => {
    app.log.error("WebSocket error:", err);
    subscriber.disconnect();
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await redis.ping();
    
    // Test market data connectivity
    const testQuote = await marketDataProvider.getQuote("MSFT");
    const providerStatus = marketDataProvider.getStatus();
    const marketDataStatus = testQuote ? "connected" : "limited";
    
    return { 
      status: "healthy", 
      redis: "connected", 
      marketData: marketDataStatus,
      dataSource: providerStatus.fallbackMode ? "simulated" : "yahoo-finance",
      fallbackMode: providerStatus.fallbackMode,
      consecutiveFailures: providerStatus.consecutiveFailures,
      timestamp: Date.now(),
      supportedSymbols: marketDataProvider.getSupportedSymbols().length,
      tickInterval: `${TICK_MS}ms`
    };
  } catch (error) {
    return res.status(503).send({ 
      status: "unhealthy", 
      redis: "disconnected", 
      marketData: "disconnected",
      dataSource: "unknown",
      timestamp: Date.now(),
      error: (error as Error).message
    });
  }
});

// Cache cleanup every 10 minutes
setInterval(async () => {
  try {
    await clearExpiredCache();
    marketDataProvider.clearExpiredCache();
  } catch (error) {
    app.log.error("Failed to clean cache:", error);
  }
}, 10 * 60 * 1000);

// Graceful shutdown
process.on("SIGTERM", async () => {
  app.log.info("SIGTERM received, shutting down gracefully");
  await redis.quit();
  await app.close();
  process.exit(0);
});

await app.listen({ port: PORT, host: "0.0.0.0" });
app.log.info(`Quote API server listening on port ${PORT}`);
app.log.info(`Supported symbols: ${marketDataProvider.getSupportedSymbols().join(", ")}`);
app.log.info(`Fallback mode: ${marketDataProvider.isInFallbackMode() ? "enabled" : "disabled"}`);
