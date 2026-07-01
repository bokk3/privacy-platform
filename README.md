# Privacy Platform

A from-scratch privacy-rights automation platform: users register, verify
identity, and authorize automated deletion requests sent to data brokers
and companies on their behalf, with full audit logging and recurring
removal scheduling.

This is an **original implementation** — architecture, code, copy, and UI
are all written for this project. It is not affiliated with, and does not
reuse any code or assets from, any commercial privacy-removal service.

> **Build status: Steps 1–2 of 8 — Foundation + Auth.** See
> [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full roadmap.
> Steps 1–2 ship: monorepo scaffolding, Docker infrastructure, the
> complete normalized database schema, the full security middleware stack,
> and a complete authentication service (register, login, email verify,
> forgot/reset password, MFA, JWT rotation, audit logging).

## Monorepo layout

```
/client            React 18 + Vite + Tailwind dashboard        (Step 5+)
/server            Express API + BullMQ workers + Prisma        (Steps 1–2)
  /prisma          schema.prisma, migrations, seed.js
  /src
    /config        env validation (zod)
    /lib           prisma, redis, logger, encryption, jwt, hash, email, totp
    /middleware    security stack, auth, error handling, validation
    /routes        Express routers (health, auth)
    /schemas       Zod validation schemas
    /services      business logic (auth, audit)
    /queues        BullMQ queues/workers                        (Step 3+)
/packages/shared   constants & enums shared by server + client
/docs              architecture, ER diagrams, deployment guide
/scripts           nginx config, deploy/dev helper scripts
docker-compose.yml Postgres, Redis, server, worker, client, nginx
```

## Prerequisites

- Docker + Docker Compose
- Node.js 20+ (only needed if running services outside Docker)

## Running locally

```bash
cp .env.example .env
# then edit .env: set real JWT secrets, FIELD_ENCRYPTION_KEY, SMTP creds
# generate secrets quickly with:
openssl rand -base64 64      # for JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / COOKIE_SECRET
openssl rand -hex 32         # for FIELD_ENCRYPTION_KEY

docker compose up postgres redis server
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

### Auth endpoints (Step 2)

```bash
# Register
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'

# Get profile (requires access token from login response)
curl http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

> `client`, `worker`, and `nginx` services are defined in
> `docker-compose.yml` for the target architecture but their application
> code lands in later steps.

## Design principles carried through every step

1. **No silent placeholders.** Every file that ships is complete and
   runnable for the scope it claims to cover.
2. **Security is not bolted on.** Encryption, validation, rate limiting,
   CSRF protection, and auth are part of the foundation.
3. **Shared source of truth.** Enums like request status and broker method
   live once, in `packages/shared`, imported by both server and client.
4. **Everything is auditable.** Every state change and auth action is
   recorded from day one.

## Next step

**Step 3 — Request & workflow engine:** BullMQ queues, state-machine
enforcement, Handlebars template rendering, retry/escalation logic.

