import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { transitionRequestStatus } from "./request.service.js";
import { REQUEST_STATUS } from "@opaca-engine/shared";

// ---------------------------------------------------------------------------
// Bounce classification
// ---------------------------------------------------------------------------

const HARD_BOUNCE_CODES = new Set([
    "550", "551", "552", "553", "554", // Permanent failures
]);

/**
 * Classifies a bounce event into hard or soft categories.
 * Hard bounces should immediately FAIL the request.
 * Soft bounces can be retried.
 */
function classifyBounce(bounceData) {
    const code = String(bounceData?.statusCode || bounceData?.reason || "").slice(0, 3);
    if (HARD_BOUNCE_CODES.has(code)) return "hard";
    // Default to soft if we can't determine
    return "soft";
}

// ---------------------------------------------------------------------------
// Thread correlation strategies
// ---------------------------------------------------------------------------

/**
 * Strategy 1: Match by outbound SMTP Message-ID.
 * The inbound reply should contain our original Message-ID in the
 * `In-Reply-To` or `References` headers.
 */
async function correlateByMessageId(inReplyTo, references) {
    const candidates = [
        ...(inReplyTo ? [inReplyTo] : []),
        ...(references ? references.split(/\s+/) : []),
    ].filter(Boolean);

    if (candidates.length === 0) return null;

    return prisma.privacyRequest.findFirst({
        where: {
            outboundMessageId: { in: candidates },
            status: REQUEST_STATUS.WAITING,
        },
    });
}

/**
 * Strategy 2: Fallback — match by broker contact email + WAITING status.
 * Less accurate but works when threading headers are stripped.
 */
async function correlateByBrokerEmail(fromEmail) {
    const broker = await prisma.broker.findFirst({
        where: { contactEmail: fromEmail },
    });

    if (!broker) return null;

    return prisma.privacyRequest.findFirst({
        where: {
            brokerId: broker.id,
            status: REQUEST_STATUS.WAITING,
        },
        orderBy: { createdAt: "desc" },
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Processes incoming email webhook events.
 * Supports both SendGrid and Mailgun-style normalized payloads.
 *
 * Threading priority:
 *   1. SMTP `In-Reply-To` / `References` header → exact match
 *   2. Sender email → broker contact email → most recent WAITING request
 */
export async function processEmailWebhook(payload) {
    const {
        from,
        to,
        subject,
        text,
        isBounce,
        bounceType,
        statusCode,
        inReplyTo,
        references,
        messageId,
    } = payload;

    logger.info({ from, to, subject, messageId }, "Processing incoming email webhook");

    // 1. Attempt thread correlation
    let request = await correlateByMessageId(inReplyTo, references);

    if (!request) {
        request = await correlateByBrokerEmail(from);
    }

    if (!request) {
        logger.warn({ from, messageId }, "Could not correlate webhook to any active request");
        return { correlated: false };
    }

    logger.info({ requestId: request.id, from }, "Correlated webhook to request");

    // 2. Route by event type
    if (isBounce) {
        const severity = classifyBounce({ statusCode, reason: bounceType });
        logger.warn({ requestId: request.id, severity }, "Bounce detected");

        if (severity === "hard") {
            // Hard bounce → permanent failure
            await transitionRequestStatus({
                requestId: request.id,
                newStatus: REQUEST_STATUS.FAILED,
                actorType: "SYSTEM",
                note: `Hard bounce (${statusCode || "unknown"}). Broker email is permanently unreachable.`,
            });

            await prisma.privacyRequest.update({
                where: { id: request.id },
                data: { lastError: `HARD_BOUNCE: ${statusCode || bounceType || "unknown"}` },
            });
        } else {
            // Soft bounce → retry
            await transitionRequestStatus({
                requestId: request.id,
                newStatus: REQUEST_STATUS.RETRY,
                actorType: "SYSTEM",
                note: `Soft bounce (${statusCode || "unknown"}). Will retry delivery.`,
            });
        }

        return { correlated: true, action: `bounce_${severity}` };
    }

    // 3. Reply received — transition to VERIFIED for manual review
    logger.info({ requestId: request.id }, "Reply received from broker");

    await transitionRequestStatus({
        requestId: request.id,
        newStatus: REQUEST_STATUS.VERIFIED,
        actorType: "SYSTEM",
        note: `Email reply received from ${from}. Preview: ${text?.slice(0, 200) || "(empty)"}`,
    });

    return { correlated: true, action: "reply_received" };
}

