import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { renderTemplate, buildRequestContext } from "../../lib/template.js";
import { sendEmail } from "../../lib/email.js";
import { transitionRequestStatus } from "../../services/request.service.js";
import { REQUEST_STATUS } from "@privacy-platform/shared";
import { scheduleCheckResponse } from "../index.js";

/**
 * Executes a privacy request dispatch based on the broker's method.
 */
export async function dispatchProcessor(job) {
    const { requestId } = job.data;
    logger.info({ jobId: job.id, requestId }, "Processing dispatch job");

    const request = await prisma.privacyRequest.findUnique({
        where: { id: requestId },
        include: {
            user: true,
            identity: {
                include: {
                    aliases: true,
                    addresses: true,
                    emails: true,
                    phones: true,
                },
            },
            broker: true,
        },
    });

    if (!request) {
        logger.warn({ requestId }, "Request not found, aborting dispatch");
        return;
    }

    // Do not process non-PENDING/RETRY requests
    if (request.status !== REQUEST_STATUS.PENDING && request.status !== REQUEST_STATUS.RETRY) {
        logger.warn({ requestId, status: request.status }, "Request not in dispatchable state");
        return;
    }

    try {
        if (request.method === "EMAIL") {
            await processEmailDispatch(request);
        } else if (request.method === "WEB_FORM") {
            logger.error("Web form automation not yet implemented");
            throw new Error("Web form automation logic to be implemented in Step 4");
        } else {
            throw new Error(`Unsupported broker method: ${request.method}`);
        }

        // Move state to SENT
        await transitionRequestStatus({
            requestId,
            newStatus: REQUEST_STATUS.SENT,
            actorType: "SYSTEM",
            note: `Dispatched successfully via ${request.method}`,
        });

        // Automatically transition to WAITING and schedule SLA check (e.g., 30 days)
        // Wait an artificial minute to prevent instant transition spam in log, or instantly switch
        await transitionRequestStatus({
            requestId,
            newStatus: REQUEST_STATUS.WAITING,
            actorType: "SYSTEM",
            note: "Awaiting response from broker",
        });

        const dueAt = new Date(Date.now() + request.broker.expectedResponseDays * 24 * 60 * 60 * 1000);
        await prisma.privacyRequest.update({ where: { id: requestId }, data: { dueAt } });

        // Schedule a BullMQ job to check up on this in `expectedResponseDays`
        const delayMs = request.broker.expectedResponseDays * 24 * 60 * 60 * 1000;
        await scheduleCheckResponse(requestId, delayMs);

        logger.info({ requestId }, "Dispatch completed successfully");
    } catch (err) {
        logger.error({ err, requestId }, "Error dispatching request");

        // Mark as FAILED for now so state is deterministic. We can retry logic later.
        await transitionRequestStatus({
            requestId,
            newStatus: REQUEST_STATUS.FAILED,
            actorType: "SYSTEM",
            note: `Dispatch failed: ${err.message}`,
        });

        await prisma.privacyRequest.update({
            where: { id: requestId },
            data: { lastError: err.message },
        });

        // Bubble error so BullMQ can track retries if queue is configured for it
        throw err;
    }
}

async function processEmailDispatch(request) {
    if (!request.broker.contactEmail) {
        throw new Error("Broker method is EMAIL but contactEmail is missing");
    }

    let templateRecord;
    if (request.templateId) {
        templateRecord = await prisma.requestTemplate.findUnique({ where: { id: request.templateId } });
    } else {
        // Failsafe: get default template
        templateRecord = await prisma.requestTemplate.findFirst({ where: { isDefaultGeneric: true } });
    }

    if (!templateRecord) {
        throw new Error("No applicable email template found");
    }

    const context = buildRequestContext(request.user, request.identity, request.broker);
    const subject = renderTemplate(templateRecord.subjectTemplate || "Privacy Request", context);
    const bodyText = renderTemplate(templateRecord.bodyTemplate, context);
    const bodyHtml = bodyText.replace(/\n/g, "<br/>"); // Basic text formatting

    const success = await sendEmail({
        to: request.broker.contactEmail,
        subject,
        text: bodyText,
        html: bodyHtml,
    });

    if (!success) {
        throw new Error("SMTP transmission failed");
    }
}
