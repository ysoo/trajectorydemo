# Quote API

A real-time price publisher that streams **live stock market quotes** from Yahoo Finance and provides fallback simulated data when markets are closed or API is unavailable. Features WebSocket streaming, REST endpoints, and Redis caching for optimal performance.

## ✨ Features

- 🌐 **Real Market Data** - Live quotes from Yahoo Finance API
- 🔄 **Intelligent Fallback** - Simulated data when real data unavailable  
- ⚡ **Real-time WebSocket streaming** - Live quote updates every 5 seconds
- 🚀 **Ultra-fast REST snapshots** - GET /v1/quotes?symbol=MSFT with Redis caching
- 📈 **Historical Data** - 1-day historical data for charting
- 📡 **Redis Pub/Sub architecture** - Scalable message distribution
- 🎯 **Multiple symbols** - MSFT, NVDA, TSLA, PLTR, ARKG, SPY, META, GOOGL
- 🔧 **Auto-recovery** - Automatic switching between real and fallback data
- 🐳 **Docker support** - Easy deployment with Docker Compose

## 📊 Data Sources

### Primary: Yahoo Finance API
- **Real-time quotes** during market hours
- **Historical data** for chart visualization
- **Market indicators** (volume, change, etc.)
- **Automatic retry** with exponential backoff

### Fallback: Simulated Market Data  
- **Realistic price movements** based on real reference prices
- **Market-aware behavior** (reduced volatility when markets closed)
- **Symbol-specific volatility** patterns (TSLA more volatile than MSFT)
- **Trend simulation** with random walk algorithms

## 🔗 API Endpoints

### REST API

#### Get Current Quote
```bash
GET /v1/quotes?symbol=MSFT
```

**Response:**
```json
{
  "symbol": "MSFT",
  "last": 384.52,
  "bid": 384.47,
  "ask": 384.57,
  "ts": 1699123456789,
  "volume": 23400000,
  "change": 12.34,
  "changePercent": 3.32,
  "high": 386.95,
  "low": 378.21,
  "open": 380.15
}
```

#### Get Quote with Historical Data
```bash
GET /v1/quotes/MSFT/history
```

**Response:**
```json
{
  "current": {
    "symbol": "MSFT",
    "last": 384.52,
    // ... other quote fields
  },
  "history": [
    {
      "symbol": "MSFT", 
      "date": "2024-01-15T09:30:00.000Z",
      "open": 380.15,
      "high": 386.95,
      "low": 378.21,
      "close": 384.52,
      "volume": 23400000,
      "timestamp": 1699123456789
    }
    // ... more historical points
  ]
}
```

#### Get Historical Data Only
```bash
GET /v1/history/MSFT
```

#### Get Supported Symbols
```bash
GET /v1/symbols
```

#### Get Market Data Status
```bash
GET /v1/status
```

**Response:**
```json
{
  "fallbackMode": false,
  "consecutiveFailures": 0,
  "dataSource": "yahoo-finance",
  "lastSuccessfulFetchAgo": 30000,
  "recommendation": "Real market data available.",
  "cacheSize": 5,
  "supportedSymbols": 5
}
```

#### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "redis": "connected", 
  "marketData": "connected",
  "dataSource": "yahoo-finance",
  "fallbackMode": false,
  "consecutiveFailures": 0,
  "timestamp": 1699123456789,
  "supportedSymbols": 5,
  "tickInterval": "5000ms"
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
  "last": 892.87,
  "bid": 892.82,
  "ask": 892.92,
  "ts": 1699123456789,
  "volume": 41200000,
  "change": 45.67,
  "changePercent": 5.39
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Redis server (local or Azure Redis)

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
   export REDIS_CONNECTION_STRING="redis://localhost:6379"
   export TICK_MS=5000  # 5 seconds for real data
   ```

4. **Start the API:**
   ```bash
   npm run dev
   ```

5. **Test the API:**
   ```bash
   # Test WebSocket and REST functionality
   npm run test-client
   
   # Test market data integration
   npm run test-market-data
   ```

### Docker Compose (Recommended)

```bash
# Start Redis + Quote API
docker-compose up

# Or run in background
docker-compose up -d
```

## 🔧 Architecture

### Real Data Flow
1. **Yahoo Finance API** - Fetches live market data
2. **Market Data Provider** - Handles API calls with retry logic
3. **Redis Cache** - Stores quotes (60s TTL) and historical data (15min TTL)
4. **Background Publisher** - Fetches random quotes every 5 seconds
5. **WebSocket Distribution** - Broadcasts to all connected clients

### Fallback Mechanism
1. **Failure Detection** - Tracks consecutive API failures
2. **Automatic Switching** - Enables fallback mode after 3 failures
3. **Simulated Data** - Generates realistic market movements
4. **Recovery Monitoring** - Periodically tests API connectivity
5. **Seamless Transition** - Switches back when API recovers

### Redis Schema

**Current Quotes:**
- Key: `quote:<SYMBOL>`
- Value: JSON quote object
- TTL: 60 seconds

**Historical Data:**
- Key: `history:<SYMBOL>`
- Value: JSON historical array
- TTL: 15 minutes

**Combined Data:**
- Key: `quote_history:<SYMBOL>`
- Value: JSON with current + history
- TTL: 5 minutes

**Pub/Sub Channel:**
- Channel: `quotes`
- Message: Real-time quote JSON

## ⚙️ Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `8080` | Server port |
| `REDIS_CONNECTION_STRING` | `redis://localhost:6379` | Redis connection URL |
| `TICK_MS` | `5000` | Quote publishing interval (ms) |

## 🧪 Testing

### Test Real Market Data
```bash
npm run test-market-data
```

**Expected output:**
```
🧪 Testing Real Market Data Integration

📊 Testing quote fetching...
✅ MSFT Quote: { symbol: 'MSFT', price: 384.52, change: 12.34, changePercent: 3.32, volume: 23400000 }

📈 Testing historical data...
✅ MSFT Historical Data: 2 points
   Latest: { date: '2024-01-15T21:00:00.000Z', close: 384.52 }

🔄 Testing quote with history...
✅ NVDA Combined Data: { currentPrice: 892.87, historyPoints: 2 }

📋 Testing provider status...
✅ Provider Status: { fallbackMode: false, consecutiveFailures: 0, cacheSize: 0, supportedSymbols: 5 }

🔍 Testing all symbols...
✅ All Quotes: 5 symbols fetched
   MSFT: $384.52 (3.32%)
   NVDA: $892.87 (5.39%)
   TSLA: $248.91 (-3.27%)
   PLTR: $26.84 (4.80%)
   ARKG: $18.34 (-12.71%)

🎉 Market data test completed!
```

### Test WebSocket Client
```bash
npm run test-client
```

## 🔍 Monitoring

### Check Data Source Status
```bash
curl http://localhost:8080/v1/status
```

### Monitor Health
```bash
curl http://localhost:8080/health
```

### View Real-time Logs
```bash
# Real data successful fetch
Published yahoo quote for MSFT: $384.52

# Fallback mode activation  
Switching to fallback mode due to prolonged API failures
Published fallback quote for NVDA: $892.87
```

## 🛠️ Deployment

### Build & Deploy
```bash
# Build TypeScript
npm run build

# Run production build
npm start

# Build Docker image
docker build -t quote-api .
```

### Azure Deployment
Use the included `deploy.sh` script for Azure Kubernetes Service:

```bash
./deploy.sh <resource-group> <acr-name> <redis-name>
```

## 🔄 Data Refresh Strategy

- **Real-time quotes**: 5-second intervals during market hours
- **Fallback quotes**: 5-second intervals with reduced volatility
- **Historical data**: Cached for 15 minutes, refreshed on demand
- **Cache cleanup**: Every 10 minutes automatic cleanup
- **API recovery**: Tested every 15 minutes when in fallback mode

## 📝 License

MIT 