import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

export const healthRouter = Router();

/**
 * Liveness probe — process is up. Always returns 200 as long as the event
 * loop is responsive; does not check dependencies.
 */
healthRouter.get("/live", (req, res) => {
  res.json({ status: "ok", uptimeSeconds: process.uptime() });
});

/**
 * Readiness probe — checks that Postgres and Redis are actually reachable.
 * Used by orchestrators/load balancers to decide whether to route traffic
 * to this instance.
 */
healthRouter.get("/ready", async (req, res) => {
  const checks = { database: false, redis: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  try {
    checks.redis = (await redis.ping()) === "PONG";
  } catch {
    checks.redis = false;
  }

  const healthy = Object.values(checks).every(Boolean);
  res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "degraded", checks });
});
