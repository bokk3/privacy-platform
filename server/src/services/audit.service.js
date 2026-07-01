import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

/**
 * Append an entry to the system-wide audit log. Fire-and-forget by default
 * (errors are logged, not thrown) so audit logging never breaks a user flow.
 */
export async function auditLog({
    actorId = null,
    actorType,
    action,
    entityType,
    entityId = null,
    ip = null,
    requestId = null,
    metadata = null,
}) {
    try {
        await prisma.auditLog.create({
            data: { actorId, actorType, action, entityType, entityId, ip, requestId, metadata },
        });
    } catch (err) {
        // Never let audit logging crash the calling flow.
        logger.error({ err, action, entityType, entityId }, "Failed to write audit log");
    }
}
