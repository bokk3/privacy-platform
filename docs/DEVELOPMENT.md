# Development Workflow Guide

Incognito Privacy is a cohesive monorepo leveraging automated pipelines, schema configurations, and UI tools. This guide accelerates the onboarding of contributors modifying logic correctly.

## 1. System Requirements

- **Node.js 20+**
- **Docker Compose** (for localized database isolation)
- **NPM Workspaces** (Native `npm` v9+ environment tooling)

## 2. Booting Local Sandbox

First, ensure local docker dependencies are alive for your backend to hook into:
```bash
docker compose up -d postgres redis
```

Afterward, start the entire node application natively (which spins both the `client` Vite dev server and the `server` Express API router). The `package.json` proxy rules tie them elegantly together via `:5173` mapping upstream to `:4000`:
```bash
npm run dev
```
Navigate to `http://localhost:5173` to explore the functioning React dashboard connected aggressively against live REST pipelines.

## 3. Dealing with Database Schema Updates

All internal logic connects via Prisma. **If you change `server/prisma/schema.prisma` natively, you must execute the migration safely without crippling data streams:**

1. Modify `schema.prisma`.
2. Generate the local client mappings:
   ```bash
   npm run prisma:generate --workspace=server
   ```
3. Issue a development migration to update the local `postgres` development container natively:
   ```bash
   npx prisma migrate dev --name <your-migration-name-here>
   ```

## 4. Frontend Component Development (Vite/React)

The `/client` directory is built using Tailwind CSS. 
- Try to inherit visual designs using `@layer components` defined inside `client/src/index.css`.
- Rely entirely on the Axios singleton at `client/src/lib/api.js`. It is programmed specifically to seamlessly handle `JWT 401 Unauthorized` token refreshes without components manually catching explicit login faults.

## 5. Adding new Automations

If a Data Broker utilizes a `WEB_FORM` or `EMAIL`, handle them strictly inside `server/src/queues/processors/dispatch.processor.js`. 
- Playwright boot scripts natively bypass CAPTCHAs where possible, but always assert explicitly when Captchas aggressively block logic, creating explicit URLs dumped smoothly to `screenshotUrl` for auditing. Never crash the thread outright, throw an Error mapped directly to our `transitionRequestStatus()` hooks.

## 6. Shared Workspace Logic Constant Additions

Constants representing `REQUEST_STATUS` engines or `ACTOR_TYPES` are locked in `packages/shared`. If you update a constant:
- **Always prefix changes natively**: This workspace maps directly to both Node backends and React Vite Frontends.
- Run `npm install` gracefully so linking symlinks explicitly track changes down safely.

## Final Note
Whenever pulling standard branches down locally, always run `npm install` at the root directory level to sync dependencies universally across all sub-workspaces concurrently.
