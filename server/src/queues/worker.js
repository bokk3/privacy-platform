import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@privacy-platform/shared";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { createBullMQConnection } from "../lib/redis.js";
import { prisma, disconnectPrisma } from "../lib/prisma.js";
import { dispatchProcessor } from "./processors/dispatch.processor.js";
import { checkResponseProcessor } from "./processors/checkResponse.processor.js";
import { retryProcessor } from "./processors/retry.processor.js";

const workers = [];

async function start() {
    logger.info("Starting BullMQ Workers...");

    // Validate DB connection before accepting jobs
    await prisma.$queryRaw`SELECT 1`;

    // 1. Dispatch Request Worker
    const dispatchWorker = new Worker(
        QUEUE_NAMES.DISPATCH_REQUEST,
        dispatchProcessor,
        {
            connection: createBullMQConnection(),
            concurrency: env.BROKER_JOB_CONCURRENCY,
        }
    );
    workers.push(dispatchWorker);

    // 2. SLA Check Worker
    const checkWorker = new Worker(
        QUEUE_NAMES.CHECK_RESPONSE,
        checkResponseProcessor,
        { connection: createBullMQConnection() }
    );
    workers.push(checkWorker);

    // 3. Retry Worker
    const retryWorker = new Worker(
        QUEUE_NAMES.RETRY_REQUEST,
        retryProcessor,
        { connection: createBullMQConnection() }
    );
    workers.push(retryWorker);

    // Default error handlers for workers
    for (const worker of workers) {
        worker.on("failed", (job, err) => {
            logger.error({ jobId: job?.id, queue: worker.name, err }, "Job failed");
        });
        worker.on("error", (err) => {
            logger.error({ queue: worker.name, err }, "Worker error");
        });
        worker.on("ready", () => {
            logger.info({ queue: worker.name }, "Worker ready and listening");
        });
    }
}

async function shutdown(signal) {
    logger.info(`${signal} received — shutting down workers selectively`);
    try {
        await Promise.all(workers.map((w) => w.close()));
        logger.info("Workers closed cleanly.");
        await disconnectPrisma();
        process.exit(0);
    } catch (err) {
        logger.error({ err }, "Error during worker shutdown");
        process.exit(1);
    }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
    logger.fatal({ err }, "Failed to start workers");
    process.exit(1);
});
