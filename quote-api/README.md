# Quote API

A real-time price publisher that streams quotes (bid/ask, last trade, timestamps) to Web-UI via WebSocket and exposes lightweight REST endpoints for snapshots.

## Features

- ✨ **Real-time WebSocket streaming** - Live quote updates every 500ms
- 🚀 **Ultra-fast REST snapshots** - GET /v1/quotes?symbol=MSFT with Redis caching
- 📡 **Redis Pub/Sub architecture** - Scalable message distribution
- ⚡ **2-second TTL cache** - Ultra-fast lookups for trade-api
- 🎯 **Multiple symbols** - MSFT, NVDA, TSLA, PLTR, ARKG
- 🐳 **Docker support** - Easy deployment with Docker Compose

## API Endpoints

### REST API

#### Get Quote Snapshot
```
GET /v1/quotes?symbol=MSFT
```

**Response:**
```json
{
  "symbol": "MSFT",
  "bid": 99.95,
  "ask": 100.05,
  "last": 100.00,
  "ts": 1699123456789
}
```

**Status Codes:**
- `200` - Quote found
- `400` - Missing symbol parameter
- `404` - Quote not available

#### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "redis": "connected",
  "timestamp": 1699123456789
}
```

### WebSocket API

#### Real-time Quote Stream
```
WS /ws
```

**Message Format:**
```json
{
  "symbol": "NVDA",
  "bid": 299.95,
  "ask": 300.05,
  "last": 300.00,
  "ts": 1699123456789
}
```

## Quick Start

### Prerequisites
- Node.js 18+
- Redis server

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Redis:**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Or using local Redis installation
   redis-server
   ```

3. **Set environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

4. **Start the API:**
   ```bash
   npm run dev
   ```

5. **Test the API:**
   ```bash
   npm run test-client
   ```

### Docker Compose (Recommended)

```bash
# Start Redis + Quote API
docker-compose up

# Or run in background
docker-compose up -d
```

## Architecture

### Data Flow

1. **Quote Generation** - Random walk algorithm generates realistic market data
2. **Redis Pub/Sub** - Publishes quotes to "quotes" channel
3. **Redis Cache** - Stores latest quotes with 2s TTL (`quote:<SYMBOL>`)
4. **WebSocket Streaming** - Subscribes to Redis pub/sub for real-time updates
5. **REST Snapshots** - Fast lookups from Redis cache

### Redis Schema

**Pub/Sub Channel:**
- Channel: `quotes`
- Message: `{"symbol":"MSFT","bid":99.95,"ask":100.05,"last":100.00,"ts":1699123456789}`

**Cache Keys:**
- Pattern: `quote:<SYMBOL>`
- Value: JSON quote object
- TTL: 2 seconds

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `8080` | Server port |
| `REDIS_CONNECTION_STRING` | `redis://localhost:6379` | Redis connection URL |

## Development

### Project Structure
```
src/
├── index.ts           # Main server & routes
├── types.ts           # TypeScript interfaces
├── quoteGenerator.ts  # Mock quote generation
└── redisPubSub.ts     # Redis pub/sub logic
```

### Build & Deploy
```bash
# Build TypeScript
npm run build

# Run production build
npm start

# Build Docker image
docker build -t quote-api .
```

## Testing

The test client demonstrates both REST and WebSocket functionality:

```bash
npm run test-client
```

**Expected output:**
```
🚀 Quote API Test Client
========================

📊 Testing REST API...
✅ Health check: { status: 'healthy', redis: 'connected', timestamp: 1699123456789 }
✅ Quote snapshot: { symbol: 'MSFT', bid: 99.95, ask: 100.05, last: 100.00, ts: 1699123456789 }

📡 Testing WebSocket streaming...
   (will show 10 quotes then disconnect)

✅ WebSocket connected
📈 NVDA: $300.00 (bid: $299.95, ask: $300.05) [2:34:56 PM]
📈 TSLA: $250.00 (bid: $249.95, ask: $250.05) [2:34:57 PM]
...
✅ WebSocket disconnected

🎉 Test completed! Quote API is working correctly.
```

## License

MIT 