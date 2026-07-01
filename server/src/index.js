import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { disconnectPrisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info(`Server listening on port ${env.API_PORT} [${env.NODE_ENV}]`);
});

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await disconnectPrisma();
    await redis.quit();
    logger.info("Shutdown complete");
    process.exit(0);
  });

  // Force-exit if graceful shutdown hangs for too long.
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — exiting");
  process.exit(1);
});
