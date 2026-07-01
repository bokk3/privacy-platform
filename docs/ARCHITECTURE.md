# Architecture — Steps 1–3 (Foundation + Auth + Request Engine)

## System overview

```
                    ┌──────────────┐
                    │    Nginx     │  :8080  (reverse proxy, edge rate-limit)
                    └──────┬───────┘
                 ┌─────────┴─────────┐
                 ▼                   ▼
        ┌────────────────┐   ┌──────────────┐
        │  React client   │   │  Express API  │  :4000
        │  (Vite, :5173)  │   │  server       │
        └────────────────┘   └──────┬────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 ▼                   ▼                   ▼
         ┌───────────────┐   ┌─────────────┐    ┌────────────────┐
         │  PostgreSQL    │   │    Redis     │    │  BullMQ Worker  │
         │  (via Prisma)  │   │ (cache, rl,  │    │  (separate      │
         │                │   │  BullMQ)     │    │  process)       │
         └───────────────┘   └─────────────┘    └────────┬────────┘
                                                            │
                                              ┌─────────────┼─────────────┐
                                              ▼             ▼             ▼
                                        Nodemailer   Playwright     Broker
                                        (email)      (web forms)    REST APIs
```

**Why a separate worker process from the API server?** Sending broker
requests, running Playwright automation, and polling for responses are
long-running / bursty operations. Running them in the same process as the
HTTP API would starve request handling under load and make horizontal
scaling of "API capacity" vs. "job throughput" impossible independently.
The `worker` container in `docker-compose.yml` runs the same codebase but
executes `src/queues/worker.js` instead of the HTTP server — they scale
and deploy independently.

**Why Prisma + PostgreSQL?** The domain is inherently relational (users →
identities → addresses/emails/phones → requests → brokers → events), with
strong consistency requirements (a request must always reference a real
broker and a real identity; status transitions must be atomic). Prisma
gives us type-safe queries, migrations, and a schema that doubles as living
documentation.

**Why BullMQ + Redis instead of pg-boss or a bare cron?** Broker requests
need retries with backoff, delayed jobs (checking a response 30 days
later), concurrency control per queue (e.g. only 3 concurrent Playwright
browser sessions), and dead-letter handling for failed jobs. BullMQ gives
us all of this on top of Redis, which we already need for rate-limiting.

## Data model rationale (see `server/prisma/schema.prisma`)

- **Multiple `Identity` rows per `User`.** People legitimately have more
  than one identity to scrub from brokers — a maiden name, a name before a
  legal change, an old address they lived at for years. Making `Identity`
  its own entity (rather than flat columns on `User`) means each identity
  can be independently targeted at brokers and tracked.
- **Field-level encryption for PII columns** (`server/src/lib/encryption.js`).
  Names, addresses, emails, and phone numbers stored in `Identity*` tables
  are AES-256-GCM encrypted before being written by Prisma. The database
  itself never holds plaintext PII, so a DB-only compromise or leaked
  backup does not expose subjects' personal data.
- **`RequestEvent` as an append-only sub-ledger of `PrivacyRequest`.**
  Rather than only tracking the current `status` on the request row, every
  transition is recorded as an immutable event (who/what/when/why). This is
  what powers both the audit trail and the timeline UI on the dashboard.
- **`AuditLog` is separate from `RequestEvent`.** `RequestEvent` is
  domain-specific to the request workflow. `AuditLog` is a system-wide,
  denormalized log of every meaningful action (logins, admin changes,
  broker edits) used for compliance and security review — it intentionally
  duplicates some information rather than joining across many tables, so it
  stays queryable and correct even after related rows are deleted.

## Request state machine

```
PENDING → SENT → WAITING → VERIFIED → COMPLETED
            │        │          │
            │        │          └──→ REJECTED → ESCALATED
            │        ├──→ REJECTED
            │        ├──→ RETRY → SENT
            │        └──→ ESCALATED
            └──→ RETRY → SENT
            └──→ FAILED → ESCALATED / RETRY
```

Legal transitions are enforced centrally in
`packages/shared/src/constants.js` (`REQUEST_STATUS_TRANSITIONS`) so both
the server (before writing a status change) and the client (before
optimistically rendering one) agree on what's possible. This prevents,
e.g., a `COMPLETED` request from silently being moved back to `PENDING` by
a buggy retry job.

## Security posture (Step 1 baseline)

| Concern | Mitigation | Where |
|---|---|---|
| Transport/headers | Helmet CSP, HSTS, frame-ancestors none | `middleware/security.js` |
| Brute force | Redis-backed rate limiting, stricter on `/auth/*` | `middleware/security.js` |
| CSRF | Double-submit cookie pattern | `middleware/security.js` |
| Param pollution | `hpp` | `middleware/security.js` |
| Injection | Prisma parameterized queries only, zod validation on every input | `middleware/validate.js` |
| PII at rest | AES-256-GCM field encryption | `lib/encryption.js` |
| Secrets | `.env`, never committed; `env.js` fails boot if missing | `config/env.js` |
| Config drift | zod-validated env schema (incl. Argon2 tuning), fail-fast at startup | `config/env.js` |

Authentication (JWT access/refresh, Argon2 hashing, MFA, session
management, CSRF token issuance flow) is implemented in **Step 2**.

## Authentication architecture (Step 2)

### Token strategy

- **Access token**: Short-lived HS256 JWT (default 15 min). Contains
  `sub` (userId), `role`, and `emailVerified`. Sent as `Authorization:
  Bearer <token>`. Stateless — never stored server-side.
- **Refresh token**: Opaque 48-byte random string. Only the SHA-256 hash
  is stored in `refresh_tokens`. Sent in request body to `/auth/refresh`.
  Default lifetime 30d.
- **Rotation with replay detection**: Every refresh creates a new token
  and revokes the old one. If a revoked token is presented, all of that
  user’s refresh tokens are revoked — this detects token theft.

### MFA flow

```
POST /auth/mfa/setup    → returns TOTP secret + otpauth URL
POST /auth/mfa/confirm  → user proves they saved secret → MFA enabled
POST /auth/login         → if MFA enabled, returns { mfaRequired, mfaChallengeToken }
POST /auth/login/mfa     → supply challengeToken + TOTP code → tokens issued
POST /auth/mfa/disable   → requires valid TOTP code to disable
```

### Auth middleware stack

- `requireAuth` — verifies JWT, sets `req.user`
- `requireVerifiedEmail` — blocks unverified users from protected routes
- `requireRole(...roles)` — role-based access control

### Auth files

```
server/src/
  lib/hash.js         Argon2id password hashing
  lib/jwt.js          JWT sign/verify, refresh token generation, duration parser
  lib/email.js        Nodemailer with verification + password reset templates
  lib/totp.js         TOTP generate/verify with encrypted secret storage
  services/
    audit.service.js  Fire-and-forget audit logger
    auth.service.js   Registration, login, MFA, email verify, password reset,
                      token rotation, logout, profile
  middleware/auth.js   requireAuth, requireVerifiedEmail, requireRole
  schemas/auth.schemas.js  Zod validation for all auth endpoints
  routes/auth.routes.js    18 Express route handlers mounted at /api/v1/auth
```

## Request Workflow architecture (Step 3)

The Request workflow leverages a state machine enforced symmetrically in the web server process and the worker process to avoid illegal state transitions. 

### Message Queues (`BullMQ`)
Tasks associated with requests are pushed off the Express thread into asynchronous background jobs targeting three queues:
- **`dispatch-request`**: Generates customized payloads based on identity details and issues communication with the target broker. Rate limited by `BROKER_JOB_CONCURRENCY`.
- **`check-response`**: Simple SLA verification jobs delayed by the target broker's configured `expectedResponseDays`. If target hasn't transitioned, escalates.
- **`retry-request`**: Retries failed attempts until `maxRetries`.

### Event Log `RequestEvent`
Every transition automatically documents its prior state, reasoning, and context. These are isolated from standard application logs or audit logs to cleanly serve user-facing timeline UI components.

### Request files

```
server/src/
  lib/template.js     Handlebars renderer using `strict` mode
  services/
    request.service.js  State machine manager and request creation utility
  queues/
    index.js            Queue definitions
    worker.js           BullMQ worker daemon wrapper logic
    processors/
        dispatch.processor.js   Email and API request implementation
        checkResponse.processor.js SLA wait verification
        retry.processor.js      Loop control for retries
  middleware/auth.js   requireAuth, requireVerifiedEmail, requireRole
  schemas/request.schemas.js Validation
  routes/request.routes.js   Private API logic endpoints mapped to /api/v1/requests
```

## What's runnable today

- `postgres`, `redis` containers.
- The `server` container boots, connects to Postgres/Redis, and exposes:
  - `GET /health/live`
  - `GET /health/ready`
  - `GET /api/v1/`
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/login/mfa`
  - `POST /api/v1/auth/verify-email`
  - `POST /api/v1/auth/resend-verification`
  - `POST /api/v1/auth/forgot-password`
  - `POST /api/v1/auth/reset-password`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/auth/logout-all`
  - `POST /api/v1/auth/mfa/setup`
  - `POST /api/v1/auth/mfa/confirm`
  - `POST /api/v1/auth/mfa/disable`
  - `POST /api/v1/requests` (Create new request)
  - `GET  /api/v1/requests/` (Get all user requests)
  - `GET  /api/v1/requests/:id/timeline` (Get individual timeline)
- `worker` container is now actively running against dispatch, checking, and retry Queues in Redis.
- Prisma schema is complete and ready for `prisma migrate dev`.

### Foundation fixes applied

- **Nginx `proxy_pass`** — removed trailing slash so the `/api/` prefix is
  preserved when forwarded to Express. Added separate `/health/` location
  that bypasses edge rate-limiting for orchestrator probes.
- **Docker dev target** — added `RUN npx prisma generate` so the
  `@prisma/client` generated output exists before the server boots.
- **`docker-compose.yml`** — removed deprecated `version: "3.9"` key.
- **`env.js`** — added `ARGON2_MEMORY_COST`, `ARGON2_TIME_COST`, and
  `ARGON2_PARALLELISM` to the Zod schema so Argon2 config is validated at
  boot and available via `env.*`.
- **Graceful shutdown** — changed `redis.disconnect()` to
  `await redis.quit()` so pending commands are flushed before close.

## What's intentionally not yet built (upcoming steps)

1. **Step 4** — Broker automation: Playwright web-form submission, email
   sending via Nodemailer, bounce/reply detection, CAPTCHA detection +
   screenshot capture on failure.
2. **Step 5** — React dashboard: stats, timeline/graphs, identity
   management UI, notifications.
3. **Step 6** — Admin dashboard: user/broker/template/log management,
   system health view.
4. **Step 7** — Public REST API + OpenAPI docs.
5. **Step 8** — Test suites (Vitest unit/integration, Supertest API,
   Playwright E2E) + GitHub Actions CI + production deployment guide.
