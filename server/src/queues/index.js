import { Queue } from "bullmq";
import { QUEUE_NAMES } from "@privacy-platform/shared";
import { createBullMQConnection } from "../lib/redis.js";

// Connections aren't safely shareable across multiple queue/worker instances
const connection = createBullMQConnection();

export const dispatchQueue = new Queue(QUEUE_NAMES.DISPATCH_REQUEST, { connection });
export const checkResponseQueue = new Queue(QUEUE_NAMES.CHECK_RESPONSE, { connection });
export const retryRequestQueue = new Queue(QUEUE_NAMES.RETRY_REQUEST, { connection });

/**
 * Enqueue a privacy request to be dispatched to a broker.
 */
export async function enqueueDispatch(requestId) {
    await dispatchQueue.add(
        "dispatch",
        { requestId },
        {
            jobId: `dispatch:${requestId}`,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 * 60 }, // 1m, 2m, 4m
        }
    );
}

/**
 * Schedule a delayed job to check if the broker has responded within their expected SLA.
 */
export async function scheduleCheckResponse(requestId, delayMs) {
    await checkResponseQueue.add(
        "check",
        { requestId },
        {
            jobId: `check:${requestId}`,
            delay: delayMs,
            removeOnComplete: true,
        }
    );
}

/**
 * Enqueue a manual or automatic retry for a failed privacy request.
 */
export async function enqueueRetry(requestId) {
    await retryRequestQueue.add(
        "retry",
        { requestId },
        {
            jobId: `retry:${requestId}-${Date.now()}`,
            removeOnComplete: true,
            removeOnFail: false,
        }
    );
}
