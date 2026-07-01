# Architecture — Step 1 (Foundation)

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
| Config drift | zod-validated env schema, fail-fast at startup | `config/env.js` |

Authentication (JWT access/refresh, Argon2 hashing, MFA, session
management, CSRF token issuance flow) is the subject of **Step 2** and
builds directly on top of this foundation.

## What's runnable today

- `postgres`, `redis` containers.
- The `server` container boots, connects to Postgres/Redis, and exposes:
  - `GET /health/live`
  - `GET /health/ready`
  - `GET /api/v1/`
- Prisma schema is complete for the domain modeled so far and ready for
  `prisma migrate dev` once Step 2 adds the auth routes that use it.

## What's intentionally not yet built (upcoming steps)

1. **Step 2** — Auth service: register/login/verify-email/forgot-reset
   password/MFA/refresh tokens, wired to the `User`/`RefreshToken`/
   `*Token` tables already defined.
2. **Step 3** — Request & workflow engine: BullMQ queues, state-machine
   enforcement, Handlebars template rendering, retry/escalation logic.
3. **Step 4** — Broker automation: Playwright web-form submission, email
   sending via Nodemailer, bounce/reply detection, CAPTCHA detection +
   screenshot capture on failure.
4. **Step 5** — React dashboard: stats, timeline/graphs, identity
   management UI, notifications.
5. **Step 6** — Admin dashboard: user/broker/template/log management,
   system health view.
6. **Step 7** — Public REST API + OpenAPI docs.
7. **Step 8** — Test suites (Vitest unit/integration, Supertest API,
   Playwright E2E) + GitHub Actions CI + production deployment guide.
