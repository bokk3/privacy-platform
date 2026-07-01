# Platform Deployment Guide

Incognito Privacy Platform is designed to scale horizontally across commodity VPS hardware using standard Docker conventions. It splits UI traffic, heavy Playwright automations, and background HTTP APIs into strictly isolated containers.

## 1. Zero-Downtime Infrastructure Dependencies

You must run these core sub-systems securely natively or abstract them into managed cloud platforms (e.g. AWS RDS or ElastiCache). Local deployment assumes identical environments:

- **PostgreSQL 15+**: Primary relational datastore handling all ORM operations.
- **Redis 7+**: Handles express rate-limiting, JWT block-lists, BullMQ workflow locking, and async email job queues.
- **SMTP Gateway**: An authenticated gateway like AWS SES, SendGrid, or Brevo to dispatch outbound emails. 

## 2. Environment Variables

Create a strict `.env` file at the root of the server repository. These variables are inherently checked at runtime by `zod` logic; the server will systematically refuse to boot if misconfigured.

```bash
# PostgreSQL Connection (Prisma)
DATABASE_URL="postgresql://user:pass@postgres:5432/incognito?schema=public"

# Redis Connectivity (BullMQ / Auth)
REDIS_URL="redis://redis:6379"

# API App Secrets (Generate these uniquely for Production)
# Run `openssl rand -base64 64`
JWT_ACCESS_SECRET="<base64-random-64-byte-string>"
JWT_REFRESH_SECRET="<base64-random-64-byte-string>"
COOKIE_SECRET="<base64-random-64-byte-string>"

# Database Field-Level Encryption
# Run `openssl rand -hex 32` - THIS MUST NEVER CHANGE AFTER BOOT OR PII IS LOST FOREVER
FIELD_ENCRYPTION_KEY="<hex-random-32-byte-string>"

# External Gateway Logic
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="<your-mailgun-api-key>"
EMAIL_FROM="privacy@yourdomain.com"
```

## 3. Deployment Steps (Docker Swarm / Compose)

For basic single-node production deployment, leverage the included `docker-compose.yml`. 

1. Ensure the `.env` file exists alongside `docker-compose.yml`.
2. Disable the internal Vite dev proxy and statically build the React dashboard for production:
   ```bash
   cd client
   npm run build
   ```
3. Boot the environment. The `client` static payload is often proxied strictly via the `nginx` container, so ensure paths are matched:
   ```bash
   docker compose up -d postgres redis server worker nginx
   ```
4. Run schema migrations and populate initial constants natively:
   ```bash
   docker compose exec server npx prisma migrate deploy
   docker compose exec server node prisma/seed.js
   ```

## 4. Architecture Scaling Considerations

- **The `worker` container** controls Playwright automation and email processing. Because Playwright instances eat memory when loading Chromium DOMs, scale `worker` containers horizontally significantly faster than `server` API containers. 
- **The `server` API container** is lightweight Node.js. Given Node's single-threaded nature, you can scale replicas mapped behind Nginx load balancers to distribute standard load effectively. Make sure Redis manages standard rate limiting across nodes smoothly.
- **Static Assets**: Put a CDN (like Cloudflare) strictly in front of your Nginx container or serve the `client/dist` outputs strictly out of S3 arrays for optimal load-balancing.

## Security Footnotes
- Mount SSL/HTTPS certificates inside Nginx rigorously. Auth payload tokens and encrypted broker PII cannot travel gracefully across unencrypted HTTP.
- Webhooks processing `/api/v1/webhooks/email` run entirely unauthenticated currently; place rigorous IP-Allow whitelists on that specific route block natively inside Nginx configurations restricting inbound POSTs strictly to SendGrid/Vendor external IPS.
