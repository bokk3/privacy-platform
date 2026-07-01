import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { transitionRequestStatus } from "../../services/request.service.js";
import { REQUEST_STATUS } from "@opaca-engine/shared";
import { enqueueRetry } from "../index.js";

/**
 * Checks up on a request that has been WAITING for the broker's SLA period.
 */
export async function checkResponseProcessor(job) {
    const { requestId } = job.data;
    logger.info({ jobId: job.id, requestId }, "Processing check-response job");

    const request = await prisma.privacyRequest.findUnique({
        where: { id: requestId },
    });

    if (!request) return;

    // We only check requests that are still sitting in WAITING
    if (request.status !== REQUEST_STATUS.WAITING) {
        logger.info({ requestId, status: request.status }, "Request is no longer WAITING, ignoring check");
        return;
    }

    // The broker hasn't responded in time (expectedResponseDays elapsed).
    // Transition to ESCALATED, or RETRY if we want auto-followup.
    // We'll mark it ESCALATED for manual review by default out of the box.

    await transitionRequestStatus({
        requestId,
        newStatus: REQUEST_STATUS.ESCALATED,
        actorType: "SYSTEM",
        note: "SLA expired without positive confirmation from broker",
    });

    // If we had retry automation for non-responsiveness, we could do:
    // await enqueueRetry(requestId);
}
