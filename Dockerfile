# syntax=docker/dockerfile:1.7
# ---------- 1. install all dependencies (cached until package*.json changes)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. build the React app and bundle the API server
FROM deps AS build
WORKDIR /app
COPY . .
ARG CDN_URL=
ENV CDN_URL=$CDN_URL
RUN npm run build && npm test

# ---------- 3. production-only dependencies
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- 4. small runtime image, runs as an unprivileged user
FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/supabase ./supabase
COPY package.json ./
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "dist-server/index.js"]
