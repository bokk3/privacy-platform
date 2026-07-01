<p align="center">
  <img src="https://img.icons8.com/color/144/000000/anonymous-mask.png" alt="Incognito Logo" width="100"/>
</p>

# Incognito Privacy Platform

**Incognito** is a fully open-source, heavily automated privacy rights management platform. It allows individuals to take back control of their digital footprint by programmatically issuing opt-out and deletion requests against data brokers across the web.

Built on robust state machines and dynamic Headless web automation, Incognito securely encrypts your identity, manages automated browser workflows navigating CAPTCHAs, digests email responses automatically, and tracks compliance timelines on a beautifully designed visual dashboard.

---

## 🚀 Features

- **Automated Workflows**: Playwright explicitly connects to Web Forms, automatically mimicking human interactions securely to scrub your identity seamlessly from the backend.
- **Robust Email Webhooks**: Ingests bounce metrics and human responses via SendGrid / Mailgun HTTP webhooks to dynamically step the unified State Machine across pipeline tracking endpoints.
- **Extremely Secure**: Sensitive Personally Identifiable Information (PII) is encrypted at rest using AES-256-GCM. Auth sessions leverage granular JWTs and explicit multi-factor TOTP authentications seamlessly integrated out of the box.
- **Beautiful Dashboards**: Executive-layered summaries via a sleek, modern React 19 Frontend built heavily on custom responsive Tailwind CSS theming. Admin "God Views" uniquely tinted to prevent cross-contamination.
- **Strict Role-Based APIs**: Node.js backend guarded rigorously by validation middlewares alongside detailed Audit Log implementations.
- **OpenAPI Compliant**: Native Swagger-UI exposing programmatic endpoints effortlessly at `/api/docs`.

## 📦 Architecture

This represents a Node.js unified Monorepo spanning strict boundaries using npm workspaces. 

```
/client            React 19 + Vite + Tailwind dashboard SPA
/server            Express API + BullMQ Queues + Redis Workers
  /prisma          Schema definitions, normalized migrations
/packages/shared   Unified application schemas, state maps, and enums
/docs              Deployment & Local Dev manuals alongside OpenAPI specs
```

## ⚡ Deployment & Local Dev

Please consult the `/docs` repository to spin up or contribute securely.

- [Deployment Guide (Live Servers)](./docs/DEPLOYMENT.md)
- [Local Developer Setup](./docs/DEVELOPMENT.md)
- [System Technical Architecture](./docs/ARCHITECTURE.md)

### Quick Start (Local)

1. Clone and map dependencies: `npm install`
2. Prep environment: `cp .env.example .env` (Set secure keys)
3. Boot databases: `docker compose up -d postgres redis`
4. Spin applications: `npm run dev`

## 🛠 Testing

Incognito asserts rigorous backend logic via `Vitest` and ensures end-to-end frontend safety using `Playwright`. CI automatically asserts code boundaries on PRs utilizing GitHub Actions against sandboxed Postgres containers natively.

```bash
# Run Backend API Integrations
npm run test --workspace=server

# Run End-to-End Frontend Workflows
npx playwright test --workspace=client
```

## ⚖️ License
Incognito is licensed under the MIT License.
