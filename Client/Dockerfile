# ───────── Stage 1: build ─────────
FROM node:18.20-alpine AS builder

# Install tini for proper PID 1 handling (optional, but good hygiene)
RUN apk add --no-cache tini

WORKDIR /app
COPY package*.json ./
RUN npm ci        # reproducible install (uses package-lock.json)
COPY . .
RUN npm run build # outputs to /app/dist by default

# ───────── Stage 2: serve static assets ─────────
# Using nginx (small, battle‑tested, supports range requests, compression)
FROM nginx:1.25-alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx conf (adds gzip + SPA history fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
