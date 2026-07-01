# Privacy Platform

A from-scratch privacy-rights automation platform: users register, verify
identity, and authorize automated deletion requests sent to data brokers
and companies on their behalf, with full audit logging and recurring
removal scheduling.

This is an **original implementation** — architecture, code, copy, and UI
are all written for this project. It is not affiliated with, and does not
reuse any code or assets from, any commercial privacy-removal service.

> **Build status: Steps 1–7 of 8 — + Swagger OpenAPI.** See
> [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full roadmap.
> Steps 1–7 ship: monorepo scaffolding, Docker infrastructure, the
> complete normalized database schema, the full security middleware stack,
> authentication service, worker workflow engine, complete Broker Automation, modern UI React Dashboard application, administrative management UIs, and Public APIs mapped through Swagger UI.

## Monorepo layout

```
/client            React 19 + Vite + Tailwind dashboard        (Step 5)
/server            Express API + BullMQ workers + Prisma        (Steps 1–4)
  /prisma          schema.prisma, migrations, seed.js
  /src
    /config        env validation (zod)
    /lib           prisma, redis, logger, encryption, jwt, hash, email, totp, template, playwright
    /middleware    security stack, auth, error handling, validation
    /routes        Express routers (health, auth, requests, webhook, admin)
    /schemas       Zod validation schemas
    /services      business logic (auth, audit, request, webhook, admin)
    /queues        BullMQ queues/workers/processors             (Steps 3-4)
/packages/shared   constants & enums shared by server + client
/docs              architecture, ER diagrams, deployment guide, openapi.yaml (Step 7)
/scripts           nginx config, deploy/dev helper scripts
docker-compose.yml Postgres, Redis, server, worker, client, nginx
```

## Prerequisites

- Docker + Docker Compose
- Node.js 20+ (only needed if running services outside Docker)

## Running locally

```bash
cp .env.example .env

# Generate required secrets:
openssl rand -base64 64      # JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / COOKIE_SECRET
openssl rand -hex 32         # FIELD_ENCRYPTION_KEY

# Boot external dependencies
docker compose up -d postgres redis

# Run monolithic development (Vite Client + Express server + Workers mapped concurrently)
npm run dev
```

Then verify:

```bash
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
curl http://localhost:4000/api/v1/
```

Generate and apply the initial migration, then seed example broker data:

```bash
docker compose exec server npm run prisma:migrate
docker compose exec server npm run prisma:seed
```

### User Experience Endpoints

The modern React Dashboard exposes the core functionality graphically. Upon booting via `npm run dev`, navigate your browser natively or issue manual payload queries.

Alternatively, visit the developer platform at `http://localhost:4000/api/docs` to visualize the OpenAPI parameters natively through Swagger.

> `client`, `worker`, and `nginx` services are defined in
> `docker-compose.yml` for the target architecture but their application
> functionality can be explored natively using NodeJS runtime without full emulation overhead locally.

## Design principles carried through every step

1. **No silent placeholders.** Every file that ships is complete and
   runnable for the scope it claims to cover.
2. **Security is not bolted on.** Encryption, validation, rate limiting,
   CSRF protection, and auth are part of the foundation.
3. **Shared source of truth.** Enums like request status and broker method
   live once, in `packages/shared`, imported by both server and client.
4. **Everything is auditable.** Every state change and auth action is
   recorded from day one.

## Next steps

**Step 8 — Testing Pipeline:** GitHub Action CI, E2E tests via Vitest & Playwright.
