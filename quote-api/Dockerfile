# ── build stage ────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── run stage ──────────────────────────────────────
FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 8080
CMD ["node","dist/index.js"]
