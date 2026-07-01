import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { transitionRequestStatus } from "./request.service.js";
import { REQUEST_STATUS } from "@privacy-platform/shared";

/**
 * Handles incoming email reply webhooks. (e.g. Inbound Parse Webhook APIs)
 * Expected minimal generic shape for bounce and text bodies.
 */
export async function processEmailWebhook(payload) {
    // Simplistic heuristic to link inbound emails back to a broker interaction.
    // In a real system, you'd use a tracked reply-to address like "reply+req123@privacy.com"
    const { from, to, subject, text, isBounce } = payload;
    logger.info({ from, to, subject }, "Processing incoming email webhook");

    // Attempt to match broker by their contact email as the sender
    const broker = await prisma.broker.findFirst({
        where: { contactEmail: from },
    });

    if (!broker) {
        logger.warn({ from }, "Webhook received from unknown broker email");
        return;
    }

    // Find the single WAITING request for this broker. This is a simplification; 
    // complex implementations parse the inbound thread headers for accurate mapping.
    const activeRequest = await prisma.privacyRequest.findFirst({
        where: {
            brokerId: broker.id,
            status: REQUEST_STATUS.WAITING,
        },
        orderBy: { createdAt: "desc" },
    });

    if (!activeRequest) {
        logger.info({ brokerId: broker.id }, "No active WAITING request found for broker, ignoring webhook");
        return;
    }

    if (isBounce) {
        logger.warn({ requestId: activeRequest.id }, "Email bounce detected");

        await transitionRequestStatus({
            requestId: activeRequest.id,
            newStatus: REQUEST_STATUS.FAILED,
            actorType: "SYSTEM",
            note: "Delivery bounced. Invalid contact email.",
        });

        // Optionally append bounce data
        await prisma.privacyRequest.update({
            where: { id: activeRequest.id },
            data: { lastError: "SMTP Bounce" },
        });

        return;
    }

    // If we receive a reply, transition the status to ACTION_REQUIRED or COMPLETED
    // depending on automation heuristics. For now we will flag it for manual review.
    logger.info({ requestId: activeRequest.id }, "Reply received from broker");

    await transitionRequestStatus({
        requestId: activeRequest.id,
        newStatus: REQUEST_STATUS.ACTION_REQUIRED,
        actorType: "SYSTEM",
        note: `Email reply received. Needs review. Preview: ${text?.slice(0, 100) || "none"}`,
    });
}
