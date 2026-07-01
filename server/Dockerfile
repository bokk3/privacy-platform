# syntax=docker/dockerfile:1

# ---- base ------------------------------------------------------------
FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=development
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- development -------------------------------------------------------
# Used by docker-compose for local dev: mounts source as a volume, runs
# `node --watch`, includes Playwright + browser binaries for broker
# automation testing.
FROM base AS development
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY packages/shared/package.json ./packages/shared/
RUN npm install
COPY . .
WORKDIR /app/server
RUN npx prisma generate
RUN npx playwright install --with-deps chromium
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ---- build (prod deps only) --------------------------------------------
FROM base AS build
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci
COPY . .
WORKDIR /app/server
RUN npx prisma generate

# ---- production ---------------------------------------------------------
FROM node:20-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/server ./server
WORKDIR /app/server
RUN npx playwright install --with-deps chromium
# Run as a non-root user in production.
RUN groupadd -r appuser && useradd -r -g appuser appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 4000
CMD ["node", "src/index.js"]
