# syntax=docker/dockerfile:1

# ---- base ------------------------------------------------------------
FROM node:20-bookworm-slim AS base
WORKDIR /app/client
ENV NODE_ENV=development

# ---- development -------------------------------------------------------
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ---- build (static SPA for production) ---------------------------------
FROM base AS build
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- production (Nginx serves the static SPA) --------------------------
FROM nginx:1.27-alpine AS production
COPY --from=build /app/client/dist /usr/share/nginx/html
# SPA fallback: all non-file routes serve index.html
RUN printf 'server {\n  listen 5173;\n  root /usr/share/nginx/html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
