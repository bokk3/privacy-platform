import Redis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// BullMQ requires maxRetriesPerRequest: null on connections it manages.
// We keep one connection for general app use (sessions/rate-limit) and
// export a factory for BullMQ so each Queue/Worker gets its own connection
// as recommended by the BullMQ docs (connections aren't safely shareable
// across many concurrent blocking workers).
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => logger.error({ err }, "Redis connection error"));
redis.on("connect", () => logger.info("Redis connected"));

export function createBullMQConnection() {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}
