# Trading Web UI

A real-time trading dashboard built with **React** and **TypeScript** that displays live market data from the Quote API. Features include real-time price updates via WebSocket, interactive charts, and a professional terminal-style interface.

## ✨ Features

- 🔴 **Real-time Market Data** - Live quotes from Quote API with Yahoo Finance integration
- ⚡ **WebSocket Streaming** - Sub-second price updates with auto-reconnection
- 📊 **Interactive Charts** - Historical price trends with gradient fills and animations
- 🎯 **Multi-symbol Support** - MSFT, NVDA, TSLA, PLTR, ARKG tracking
- 🔄 **Auto-reconnection** - Resilient WebSocket connections with exponential backoff
- 🛡️ **Error Handling** - Graceful fallbacks and connection status monitoring
- 💎 **Terminal UI** - Modern dark theme with yellow/green/red accents
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## 🏗️ Architecture

### Data Flow
```
Quote API ──► WebSocket ──► React State ──► UI Components
    │              │
    ▼              ▼
REST Endpoints   Real-time    
(Snapshots)     (Streaming)   
```

### Component Structure
```
App
├── Header (Terminal branding + live indicator)
├── Dashboard
│   ├── Connection Status (shows WebSocket state)
│   ├── Market Summary (market indices)
│   ├── Stock Tickers Grid
│   │   └── StockTicker
│   │       ├── Price Display
│   │       ├── StockChart (real-time trend)
│   │       └── Market Stats
│   └── News Scroller
└── Error Boundaries
```

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:5173
```

### Environment Variables
```bash
# Quote API Configuration
VITE_QUOTE_API_BASE_URL=http://localhost:8080
VITE_QUOTE_API_WS_URL=ws://localhost:8080/ws

# For Kubernetes internal communication
VITE_QUOTE_API_BASE_URL=http://quote-api-service.quote-api.svc.cluster.local
VITE_QUOTE_API_WS_URL=ws://quote-api-service.quote-api.svc.cluster.local/ws
```

### Testing API Integration
```bash
# Test connection to Quote API
npm run test-api

# Expected output:
# ✅ Health check passed
# ✅ All quotes retrieved
# ✅ WebSocket connected
# ✅ Historical data available
```

## 🐳 Docker Deployment

### Build Image
```bash
# For local development
docker build -t trading-web-ui .

# For production with custom API URLs
docker build \
  --build-arg VITE_QUOTE_API_BASE_URL=http://your-api-server \
  --build-arg VITE_QUOTE_API_WS_URL=ws://your-api-server/ws \
  -t trading-web-ui:v2.0.0 .
```

### Run Container
```bash
docker run -p 8080:80 trading-web-ui
# Access at http://localhost:8080
```

## ☸️ Kubernetes Deployment

### Deploy to AKS
```bash
# Deploy with automated script
./deploy.sh <resource-group> <acr-name> [image-tag]

# Example
./deploy.sh my-rg my-acr v2.0.0
```

### Manual Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/web-ui-deployment.yaml

# Check deployment status
kubectl get pods -l app=web-ui
kubectl get service web-ui-svc

# Port forward for testing
kubectl port-forward service/web-ui-svc 8080:80
```

## 📊 Real-time Features

### WebSocket Integration
- **Auto-connect** on dashboard load
- **Exponential backoff** reconnection (max 10 attempts)
- **Connection status** indicator (green=live, red=reconnecting)
- **Fallback to REST** when WebSocket unavailable

### Price Updates
- **Flash animations** when prices change
- **Real-time charts** with new price points added live
- **Historical data** preserved during updates
- **Volume formatting** (1.2M, 2.5B, etc.)

### Error Handling
- **Connection errors** with retry buttons
- **API unavailable** graceful fallback
- **Loading states** with spinners
- **Empty states** when no data available

## 🎨 UI Components

### Stock Ticker
- **Price display** with change indicators
- **Trend arrows** (green up, red down)
- **Mini chart** with gradient fills
- **Market stats** (high, low, volume, market cap)
- **Flash effect** for real-time updates

### Connection Status
- **Live indicator** (green dot when connected)
- **Data source** display (websocket, api, fallback)
- **Reconnection attempts** counter
- **Error messages** for troubleshooting

### Market Summary
- **Major indices** (S&P 500, NASDAQ, DOW)
- **Market indicators** (VIX, USD/EUR, Gold)
- **Static data** (not connected to Quote API)

## 🔧 Development

### Project Structure
```
src/
├── components/           # React components
│   ├── Dashboard.tsx    # Main dashboard with real-time data
│   ├── StockTicker.tsx  # Individual stock display
│   ├── StockChart.tsx   # Price trend visualization
│   ├── Header.tsx       # App header with branding
│   ├── MarketSummary.tsx # Market indices display
│   └── NewsScroller.tsx # News ticker
├── services/            # API integration
│   └── quoteApi.ts      # Quote API client with WebSocket
├── types/               # TypeScript definitions
│   └── stock.ts         # Data interfaces
├── utils/               # Helper functions
│   ├── formatters.ts    # Price/time formatting
│   └── stockUtils.ts    # Data transformation
├── data/                # Static data
│   └── stocks.ts        # News items and metadata
└── styles/              # CSS and styling
    └── index.css        # Tailwind CSS
```

### Key Technologies
- **React 18** - UI framework with hooks
- **TypeScript** - Type safety and development experience
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Chart library for price visualization
- **Lucide React** - Icons and visual elements

### Data Flow
1. **Initial Load** - Fetch all quotes with history via REST
2. **WebSocket Connect** - Establish real-time connection
3. **Live Updates** - Receive price updates and update charts
4. **Error Recovery** - Auto-reconnect and fallback to REST polling

## 📈 Performance

- **WebSocket** for real-time updates (sub-second latency)
- **REST fallback** every 10 seconds when WebSocket down
- **Chart optimization** with limited data points (50 max)
- **Lazy loading** for large datasets
- **Memory management** with cleanup on unmount

## 🔍 Monitoring

### Connection Status
- Green dot: WebSocket connected and receiving data
- Red dot: Reconnecting or using REST fallback
- Data source indicator: websocket, api, or fallback

### Logs
```bash
# View container logs
docker logs <container-id>

# Kubernetes logs
kubectl logs -l app=web-ui --tail=100 -f
```

### Health Checks
- **Readiness probe**: HTTP GET / (port 80)
- **Liveness probe**: HTTP GET / (port 80)
- **API connectivity**: Tested on dashboard load

## 🚨 Troubleshooting

### Common Issues

**API Connection Failed**
```
Error: Unable to connect to Quote API
Solution: Verify Quote API is running and accessible
```

**WebSocket Reconnecting**
```
Status: Red dot, "Reconnecting..."
Solution: Check network connectivity, API WebSocket endpoint
```

**No Stock Data**
```
Message: "No Stock Data Available"
Solution: Check Quote API health, Redis connection
```

### Debug Commands
```bash
# Test API connectivity
npm run test-api

# Check environment variables
echo $VITE_QUOTE_API_BASE_URL
echo $VITE_QUOTE_API_WS_URL

# Check Quote API health directly
curl http://localhost:8080/health
curl http://localhost:8080/v1/quotes?symbol=MSFT
```

## 📝 Version History

### v2.0.0 (Current)
- ✅ Real Quote API integration
- ✅ WebSocket real-time streaming
- ✅ Historical chart data
- ✅ Auto-reconnection logic
- ✅ Connection status monitoring

### v1.0.0 (Previous)
- Mock data generation
- Static charts
- No API integration

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details