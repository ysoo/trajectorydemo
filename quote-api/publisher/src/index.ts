import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import { marketDataProvider } from "./marketDataProvider.js";
import { 
  publishQuote, 
  redis, 
  clearExpiredCache
} from "./redisPub.js";

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
        /^http?:\/\/52\.158\.166\.7(:\d+)?$/,   // Frontend server IP
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
  
  // Cache and return
  await publishQuote(quote);
  return quote;
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

// Background publisher - fetches and publishes real quotes
setInterval(async () => {
  try {
    const quote = await marketDataProvider.getRandomQuote();
    if (quote) {
      await publishQuote(quote);
      const dataSource = marketDataProvider.isInFallbackMode() ? "fallback" : "yahoo";
      app.log.info(`Published ${dataSource} quote for ${quote.symbol}: $${quote.last}`);
    }
  } catch (error) {
    app.log.error("Failed to publish quote:", error);
  }
}, TICK_MS);

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
app.log.info(`Publishing real market data every ${TICK_MS}ms`);
app.log.info(`Supported symbols: ${marketDataProvider.getSupportedSymbols().join(", ")}`);
app.log.info(`Fallback mode: ${marketDataProvider.isInFallbackMode() ? "enabled" : "disabled"}`);
