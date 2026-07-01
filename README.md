# Privacy Platform

A from-scratch privacy-rights automation platform: users register, verify
identity, and authorize automated deletion requests sent to data brokers
and companies on their behalf, with full audit logging and recurring
removal scheduling.

This is an **original implementation** — architecture, code, copy, and UI
are all written for this project. It is not affiliated with, and does not
reuse any code or assets from, any commercial privacy-removal service.

> **Build status: Step 1 of 8 — Foundation.** See
> [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full roadmap.
> This step ships: monorepo scaffolding, Docker infrastructure, the
> complete normalized database schema, and a running Express API skeleton
> with the full security middleware stack. Auth, the request/workflow
> engine, broker automation, and the React dashboard are **not yet
> included** — they're the subject of Steps 2–8, delivered incrementally
> so each piece is real, complete, and reviewable rather than a large
> unverified drop.

## Monorepo layout

```
/client            React 18 + Vite + Tailwind dashboard        (Step 5+)
/server            Express API + BullMQ workers + Prisma        (this step)
  /prisma          schema.prisma, migrations, seed.js
  /src
    /config        env validation (zod)
    /lib           prisma client, redis client, logger, encryption
    /middleware    security stack, error handling, validation
    /routes        Express routers
    /queues        BullMQ queues/workers                        (Step 3+)
    /services      business logic                                (Step 2+)
/packages/shared   constants & enums shared by server + client
/docs              architecture, ER diagrams, deployment guide
/scripts           nginx config, deploy/dev helper scripts
docker-compose.yml Postgres, Redis, server, worker, client, nginx
```

## Prerequisites

- Docker + Docker Compose
- Node.js 20+ (only needed if running services outside Docker)

## Running Step 1 locally

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

Generate and apply the initial migration, then seed example (fictional,
development-only) broker data:

```bash
docker compose exec server npm run prisma:migrate
docker compose exec server npm run prisma:seed
```

> `client`, `worker`, and `nginx` services are defined in
> `docker-compose.yml` for the target architecture but their application
> code lands in later steps — running `docker compose up` for all services
> today will fail on those three until then. `postgres`, `redis`, and
> `server` are fully functional now.

## Design principles carried through every step

1. **No silent placeholders.** Every file that ships is complete and
   runnable for the scope it claims to cover.
2. **Security is not bolted on.** Encryption, validation, rate limiting,
   and CSRF protection are part of the foundation, not an afterthought
   added in a later "security pass."
3. **Shared source of truth.** Enums like request status and broker method
   live once, in `packages/shared`, imported by both server and client —
   never redefined and risking drift.
4. **Everything is auditable.** The schema is built so that every state
   change (`RequestEvent`) and every meaningful action (`AuditLog`) is
   recorded from day one, not retrofitted.

## Next step

**Step 2 — Authentication service:** register, login, email verification,
forgot/reset password, MFA (TOTP) enrollment and verification, JWT
access/refresh token issuance and rotation, and the corresponding
Vitest + Supertest test suite. Say the word and I'll build it on top of
this exact schema and middleware stack.
