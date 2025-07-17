# ───────── Stage 1: build ─────────
FROM node:18.20-alpine AS builder

# Install tini for proper PID 1 handling (optional, but good hygiene)
RUN apk add --no-cache tini

# Accept build arguments for API configuration
ARG VITE_QUOTE_API_BASE_URL=http://localhost:8080
ARG VITE_QUOTE_API_WS_URL=ws://localhost:8080/ws

# Set environment variables for Vite build
ENV VITE_QUOTE_API_BASE_URL=${VITE_QUOTE_API_BASE_URL}
ENV VITE_QUOTE_API_WS_URL=${VITE_QUOTE_API_WS_URL}

WORKDIR /app
COPY package*.json ./
RUN npm ci        # reproducible install (uses package-lock.json)
COPY . .

# Build with environment variables embedded
RUN npm run build # outputs to /app/dist by default

# ───────── Stage 2: serve static assets ─────────
# Using nginx (small, battle‑tested, supports range requests, compression)
FROM nginx:1.25-alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx conf (adds gzip + SPA history fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add labels for better container management
LABEL app="trading-web-ui"
LABEL version="2.0.0"
LABEL description="Real-time trading dashboard with Quote API integration"

EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
