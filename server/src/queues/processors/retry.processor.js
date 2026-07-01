import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { transitionRequestStatus } from "../../services/request.service.js";
import { REQUEST_STATUS } from "@opaca-engine/shared";
import { enqueueDispatch } from "../index.js";

/**
 * Processes retry signals for failed requests.
 */
export async function retryProcessor(job) {
    const { requestId } = job.data;
    logger.info({ jobId: job.id, requestId }, "Processing retry job");

    const request = await prisma.privacyRequest.findUnique({
        where: { id: requestId },
    });

    if (!request) return;

    if (request.retryCount >= request.maxRetries) {
        logger.warn({ requestId }, "Max retries reached, permanently escalating");
        await transitionRequestStatus({
            requestId,
            newStatus: REQUEST_STATUS.ESCALATED,
            actorType: "SYSTEM",
            note: "Max retries exceeded",
        });
        return;
    }

    // Transition to RETRY status to satisfy state machine laws
    await transitionRequestStatus({
        requestId,
        newStatus: REQUEST_STATUS.RETRY,
        actorType: "SYSTEM",
        note: `Retrying (attempt ${request.retryCount + 1})`,
    });

    // Increment retry count
    await prisma.privacyRequest.update({
        where: { id: requestId },
        data: { retryCount: { increment: 1 } },
    });

    // Put it back onto the dispatch queue
    await enqueueDispatch(requestId);
}
