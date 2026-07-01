import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { auditLog } from "./audit.service.js";
import {
    REQUEST_STATUS,
    canTransition,
    AUDIT_ACTION,
} from "@privacy-platform/shared";
import { enqueueDispatch } from "../queues/index.js";
import { logger } from "../lib/logger.js";

/**
 * Creates a new privacy request, logs the CREATED event, and enqueues it for dispatch.
 */
export async function createRequest({ userId, identityId, brokerId, method, templateId = null, ip }) {
    // Ensure identity belongs to user
    const identity = await prisma.identity.findFirst({
        where: { id: identityId, userId },
    });
    if (!identity) {
        throw new AppError("Identity not found or does not belong to user.", 404, "NOT_FOUND");
    }

    // Ensure broker exists and is active
    const broker = await prisma.broker.findUnique({ where: { id: brokerId } });
    if (!broker || broker.status !== "ACTIVE") {
        throw new AppError("Broker not found or not active.", 400, "BROKER_INVALID");
    }

    // Ensure no active request already exists for this identity+broker combination
    const existing = await prisma.privacyRequest.findFirst({
        where: {
            userId,
            identityId,
            brokerId,
            status: { notIn: [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.REJECTED] },
        },
    });

    if (existing) {
        throw new AppError(
            "An active privacy request already exists for this broker and identity.",
            409,
            "REQUEST_ALREADY_EXISTS"
        );
    }

    // Determine method/template
    // If no template is provided, use the broker's default generic template if method is EMAIL
    let resolvedTemplateId = templateId;
    if (!resolvedTemplateId && method === "EMAIL") {
        const genericTemplate = await prisma.requestTemplate.findFirst({
            where: { isDefaultGeneric: true },
        });
        if (genericTemplate) {
            resolvedTemplateId = genericTemplate.id;
        }
    }

    const request = await prisma.$transaction(async (tx) => {
        const req = await tx.privacyRequest.create({
            data: {
                userId,
                identityId,
                brokerId,
                status: REQUEST_STATUS.PENDING,
                method,
                templateId: resolvedTemplateId,
            },
        });

        await tx.requestEvent.create({
            data: {
                requestId: req.id,
                toStatus: REQUEST_STATUS.PENDING,
                actorType: "USER",
                actorId: userId,
                note: "Request generated.",
            },
        });

        return req;
    });

    await auditLog({
        actorId: userId,
        actorType: "USER",
        action: AUDIT_ACTION.REQUEST_CREATED,
        entityType: "PrivacyRequest",
        entityId: request.id,
        ip,
    });

    // Enqueue for processing immediately
    await enqueueDispatch(request.id).catch((err) => {
        logger.error({ err, requestId: request.id }, "Failed to enqueue request dispatch");
    });

    return request;
}

/**
 * Transitions a request to a new status securely, validating state machine rules.
 */
export async function transitionRequestStatus({ requestId, newStatus, actorId, actorType, note = "", ip = null }) {
    const request = await prisma.privacyRequest.findUnique({
        where: { id: requestId },
    });

    if (!request) {
        throw new AppError("Privacy request not found.", 404, "NOT_FOUND");
    }

    if (request.status === newStatus) return request;

    if (!canTransition(request.status, newStatus)) {
        throw new AppError(
            `Illegal state transition from ${request.status} to ${newStatus}.`,
            400,
            "ILLEGAL_TRANSITION"
        );
    }

    // Handle specific status-related timestamps
    const updates = { status: newStatus };
    if (newStatus === REQUEST_STATUS.SENT && !request.sentAt) {
        updates.sentAt = new Date();
    }
    if (newStatus === REQUEST_STATUS.COMPLETED) {
        updates.completedAt = new Date();
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
        const updated = await tx.privacyRequest.update({
            where: { id: requestId },
            data: updates,
        });

        await tx.requestEvent.create({
            data: {
                requestId,
                fromStatus: request.status,
                toStatus: newStatus,
                actorType,
                actorId,
                note,
            },
        });

        return updated;
    });

    await auditLog({
        actorId,
        actorType,
        action: AUDIT_ACTION.REQUEST_STATUS_CHANGED,
        entityType: "PrivacyRequest",
        entityId: requestId,
        ip,
        metadata: { from: request.status, to: newStatus },
    });

    return updatedRequest;
}

export async function getRequests(userId, query = {}) {
    const { status, brokerId, skip = 0, take = 50 } = query;

    const filter = { userId };
    if (status) filter.status = status;
    if (brokerId) filter.brokerId = brokerId;

    const [count, requests] = await prisma.$transaction([
        prisma.privacyRequest.count({ where: filter }),
        prisma.privacyRequest.findMany({
            where: filter,
            include: {
                broker: { select: { id: true, name: true, method: true } },
                identity: { select: { id: true, label: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: Number(skip),
            take: Number(take),
        }),
    ]);

    return { count, data: requests };
}

export async function getRequestActivity(requestId, userId) {
    const request = await prisma.privacyRequest.findFirst({
        where: { id: requestId, userId },
    });
    if (!request) throw new AppError("Request not found.", 404, "NOT_FOUND");

    const events = await prisma.requestEvent.findMany({
        where: { requestId },
        orderBy: { createdAt: "asc" },
    });

    return events;
}
