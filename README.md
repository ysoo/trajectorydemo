# Real-Time Trading System

A comprehensive **microservices-based trading platform** built on **Azure Kubernetes Service (AKS)** with real-time market data streaming, secure internal communication, and enterprise-grade scalability.

## 🚀 **System Overview**

This trading system provides real-time market data streaming with a modern React-based dashboard. The architecture emphasizes **security-first design** with no external API exposure, internal service communication via Kubernetes DNS, and Azure Redis for ultra-low latency data distribution.

### **Key Features**
- ⚡ **Real-time streaming** - 500ms market data updates via WebSocket
- 🛡️ **Internal-only services** - No external API exposure (ClusterIP only)
- 📊 **Multi-symbol support** - MSFT, NVDA, TSLA, PLTR, ARKG
- 🔄 **Auto-scaling** - Kubernetes HPA with CPU-based scaling
- 🎯 **High availability** - Multiple replicas with health checks
- 💰 **Modern UI** - Terminal-style trading dashboard

---

## 🏗️ **System Architecture**

```
Trading System Architecture 
                               ┌────────────────────┐
                               │     web‑ui pod     │
                               │        (AKS)       │
                               │ • React/Vite UI    │
                               │ • Health checks    │
                               └────────┬───────────┘
                    REST / WebSocket    │           WebSocket quotes
                                         │                     ▲
                                         │                     │
                  ┌──────────────────────▼─────────────────────┐
                  │               AKS cluster                  │
                  │                                            │
                  │  ┌────────────────────┐   ┌────────────────────┐
                  │  │   quote‑api pod    │   │   trading pods     │
                  │  │      (AKS)         │   │    (future)        │
                  │  │ • /v1/quotes       │   │ • /v1/orders       │
                  │  │ • /ws streaming    │   │ • /v1/accounts     │
                  │  │ • Publishes ticks  │   │ • Managed ID*      │
                  │  └────────┬───────────┘   └────────┬───────────┘
                  │           │ pub/sub + cache         │
                  └───────────┼──────────────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Azure Redis  │
                       │ Cache + PubSub│
                       └──────────────┘
                              ▲
                              │ secrets / connection
                              │ via connection string
                       ┌──────────────┐
                       │ Azure Key    │
                       │   Vault      │
                       └──────────────┘
```

### **Component Architecture**

| Component | Technology | Purpose | Replicas |
|-----------|-----------|---------|----------|
| **Web UI** | React + Vite + TypeScript | Trading dashboard frontend | 2 |
| **Quote API** | Node.js + Fastify + ioredis | Real-time market data service | 3 |
| **Azure Redis** | Managed Redis Cache | Pub/Sub + Caching layer | 1 (HA) |

---

## 🔄 **Data Flow Architecture**

### **1. Quote Generation & Publishing**

```
Quote Generator ──► Redis Pub/Sub ──► WebSocket Clients
       │                   │
       │                   ▼
       └─────────► Redis Cache (2-sec TTL)
```

**Process Flow:**
1. **Background Timer** - Generates market data every 500ms
2. **Redis Publishing** - Publishes to `"quotes"` channel
3. **Cache Storage** - Stores with 2-second TTL for REST lookups
4. **WebSocket Broadcasting** - Distributes to all connected clients

### **2. Real-time Data Distribution**

**Redis Pub/Sub Pattern:**
```typescript
// Publisher (quote-api backend)
await redis.publish("quotes", JSON.stringify({
  symbol: "MSFT",
  bid: 99.95,
  ask: 100.05, 
  last: 100.00,
  ts: 1699123456789
}));

// Subscriber (WebSocket connections)
subscriber.on("message", (channel, message) => {
  if (channel === "quotes") {
    const quote = JSON.parse(message);
    webSocketClients.forEach(client => {
      client.send(JSON.stringify(quote));
    });
  }
});
```

### **3. Client Data Consumption**

**Dual Access Patterns:**

**A) REST API (Snapshots)**
```bash
GET /v1/quotes?symbol=MSFT
# ├─ Fetches from Redis cache
# └─ Returns current quote instantly
```

**B) WebSocket (Real-time Stream)**
```bash
WS /ws
# ├─ Subscribes to Redis "quotes" channel  
# ├─ Receives all symbol updates
# └─ Updates UI with 500ms frequency
```

---

## 🌐 **Network & Security Architecture**

### **Internal Service Communication**

```
┌─────────────────────────────────────────────────────────┐
│                 AKS Cluster                             │
│                                                         │
│  ┌─────────────────┐         ┌──────────────────────┐   │
│  │  web-ui-svc     │────────►│ quote-api-service    │   │
│  │  (default ns)   │         │  (quote-api ns)      │   │
│  │  ClusterIP:80   │         │  ClusterIP:80        │   │
│  └─────────────────┘         └──────────────────────┘   │
│           │                            │                │
│           ▼                            ▼                │
│  ┌─────────────────┐         ┌──────────────────────┐   │
│  │   Web UI Pods   │         │   Quote API Pods    │   │ 
│  │   (React SPA)   │         │   (Node.js/Fastify) │   │
│  └─────────────────┘         └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                                         │
                              ┌─────────▼──────────┐
                              │   Azure Redis      │
                              │ (External Service) │
                              └────────────────────┘
```

### **Security Features**
- 🔒 **ClusterIP Services** - No external exposure
- 🌐 **Internal DNS** - Service-to-service communication
- 🔐 **SSL/TLS** - Azure Redis with SSL encryption
- 👤 **Non-root containers** - Security contexts applied
- 🛡️ **ReadOnly filesystem** - Minimal attack surface

---

## 📊 **Technical Implementation**

### **Quote Data Schema**
```typescript
interface Quote {
  symbol: string;    // Stock symbol (MSFT, NVDA, TSLA, PLTR, ARKG)
  bid: number;       // Bid price (last - 0.05)
  ask: number;       // Ask price (last + 0.05)
  last: number;      // Last trade price (random walk)
  ts: number;        // Timestamp (Date.now())
}
```

### **Redis Configuration**
```typescript
// Azure Redis SSL configuration
const redisConfig = {
  connectTimeout: 60000,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  tls: {
    rejectUnauthorized: false,  // Required for Azure Redis
    servername: redisHostname
  }
};
```

### **WebSocket Auto-Reconnection**
```typescript
// Client-side auto-reconnection with exponential backoff
const connectWebSocket = () => {
  const ws = new WebSocket(WS_URL);
  
  ws.onclose = () => {
    setTimeout(() => {
      reconnectAttempts++;
      connectWebSocket(); // Auto-reconnect
    }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000));
  };
};
```

---

## 🚀 **Quick Start Guide**

### **Prerequisites**
- Azure CLI installed and configured
- kubectl configured for your AKS cluster
- Docker installed locally
- Existing Azure resources: AKS cluster, ACR, Redis Cache

### **1. Deploy Quote API**
```bash
cd quote-api
./deploy.sh <resource-group> <acr-name> <redis-name>
```

### **2. Deploy Web UI**
```bash  
cd Client
./deploy.sh <resource-group> <acr-name> [image-tag]
```

### **3. Access the Application**
```bash
# Port-forward to access Web UI
kubectl port-forward service/web-ui-svc 8080:80

# Open browser
open http://localhost:8080
```

---

## 🔧 **Development Setup**

### **Local Development (Docker Compose)**
```bash
# Start Quote API with local Redis
cd quote-api
docker-compose up -d

# Start Client development server
cd Client  
npm install
npm run dev
```

### **Environment Variables**
```bash
# Quote API
REDIS_CONNECTION_STRING=redis://localhost:6379
PORT=8080
TICK_MS=500

# Client
VITE_QUOTE_API_BASE_URL=http://localhost:8080
VITE_QUOTE_API_WS_URL=ws://localhost:8080/ws
```

---

## 📁 **Project Structure**

```
trajectorydemo/
├── README.md                 # This file
├── quote-api/               # Backend API service
│   ├── src/
│   │   ├── index.ts         # Main server & routes
│   │   ├── redisPubSub.ts   # Redis pub/sub logic
│   │   ├── quoteGenerator.ts # Market data generation
│   │   └── types.ts         # TypeScript interfaces
│   ├── k8s-deployment.yaml  # Kubernetes manifests
│   ├── deploy.sh           # Deployment script
│   ├── Dockerfile          # Container definition
│   └── package.json        # Node.js dependencies
├── Client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API integration
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Helper functions
│   ├── k8s/
│   │   └── web-ui-deployment.yaml # K8s manifests
│   ├── deploy.sh           # Deployment script
│   ├── Dockerfile          # Container definition
│   └── package.json        # Frontend dependencies
└── Infra/                  # Infrastructure as Code (future)
```

---

## 🔍 **Monitoring & Operations**

### **Health Checks**
```bash
# Quote API health
kubectl exec -it <quote-api-pod> -- curl http://localhost:8080/health

# Redis connectivity test
kubectl run redis-test --image=redis:7-alpine --rm -it --restart=Never -- \
  redis-cli -h <redis-host> -p 6380 --tls ping
```

### **Scaling**
```bash
# Scale Quote API
kubectl scale deployment quote-api --replicas=5 -n quote-api

# Scale Web UI  
kubectl scale deployment web-ui --replicas=3

# Check HPA status
kubectl get hpa quote-api-hpa -n quote-api --watch
```

### **Logs & Debugging**
```bash
# Stream Quote API logs
kubectl logs -f -l app=quote-api -n quote-api

# Check WebSocket connections
kubectl exec -it <quote-api-pod> -n quote-api -- \
  curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:8080/ws
```

---

## 🔗 **Service URLs (Internal)**

| Service | URL | Purpose |
|---------|-----|---------|
| **Quote API REST** | `http://quote-api-service.quote-api.svc.cluster.local/v1/quotes` | Quote snapshots |
| **Quote API WebSocket** | `ws://quote-api-service.quote-api.svc.cluster.local/ws` | Real-time stream |
| **Quote API Health** | `http://quote-api-service.quote-api.svc.cluster.local/health` | Health checks |
| **Web UI** | `http://web-ui-svc.default.svc.cluster.local` | Trading dashboard |

---

## 📈 **Performance Characteristics**

- **Latency**: Sub-500ms quote updates
- **Throughput**: 1000+ concurrent WebSocket connections  
- **Availability**: 99.9% uptime with pod replicas
- **Scalability**: Horizontal scaling via Kubernetes HPA
- **Recovery**: Auto-reconnection with exponential backoff

---

## 🛠️ **Technology Stack**

### **Backend**
- **Runtime**: Node.js 18+ 
- **Framework**: Fastify (high-performance web framework)
- **WebSockets**: @fastify/websocket
- **Redis Client**: ioredis with SSL support
- **Language**: TypeScript

### **Frontend** 
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS  
- **Icons**: Lucide React
- **WebSocket**: Native WebSocket API

### **Infrastructure**
- **Container Platform**: Azure Kubernetes Service (AKS)
- **Container Registry**: Azure Container Registry (ACR)
- **Cache/Messaging**: Azure Redis Cache
- **Networking**: Kubernetes ClusterIP services
- **SSL/TLS**: Azure-managed certificates

---

## 📝 **License**

MIT License - see individual component READMEs for details.

---

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 **Support**

For deployment issues or technical questions, refer to:
- [Quote API Documentation](./quote-api/README.md)
- [Client Documentation](./Client/README.md)
- [Azure Deployment Guide](./quote-api/AZURE_DEPLOYMENT.md)
