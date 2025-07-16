import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { nextQuote } from "./quoteGenerator.js";
import { publishQuote, redis, subscribeToQuotes } from "./redisPubSub.js";
import type { Quote } from "./types.js";

const PORT = process.env.PORT ? +process.env.PORT : 8080;
const TICK_MS = 500; // half‑second fake ticks

const app = Fastify({ logger: true });
await app.register(websocket);

// REST snapshot endpoint
app.get("/v1/quotes", async (req, res) => {
  const { symbol } = req.query as { symbol: string };
  
  if (!symbol) {
    return res.status(400).send({ message: "symbol parameter is required" });
  }
  
  const val = await redis.get(`quote:${symbol}`);
  if (!val) {
    return res.status(404).send({ message: "quote not available" });
  }
  
  return JSON.parse(val);
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
    return { status: "healthy", redis: "connected", timestamp: Date.now() };
  } catch (error) {
    return res.status(503).send({ 
      status: "unhealthy", 
      redis: "disconnected", 
      timestamp: Date.now() 
    });
  }
});

// Background publisher - generates and publishes quotes
setInterval(async () => {
  try {
    const q = nextQuote();
    await publishQuote(q);
  } catch (error) {
    app.log.error("Failed to publish quote:", error);
  }
}, TICK_MS);

// Graceful shutdown
process.on("SIGTERM", async () => {
  app.log.info("SIGTERM received, shutting down gracefully");
  await redis.quit();
  await app.close();
  process.exit(0);
});

await app.listen({ port: PORT, host: "0.0.0.0" });
app.log.info(`Quote API server listening on port ${PORT}`);
