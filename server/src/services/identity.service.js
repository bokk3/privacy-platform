import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { auditLog } from "./audit.service.js";
import { AUDIT_ACTION } from "@privacy-platform/shared";

/**
 * Creates a new personal identity for a user.
 */
export async function createIdentity({ userId, data, ip }) {
    const { aliases, addresses, emails, phones, ...coreData } = data;

    const identity = await prisma.$transaction(async (tx) => {
        return tx.identity.create({
            data: {
                ...coreData,
                userId,
                aliases: { create: aliases },
                addresses: { create: addresses },
                emails: { create: emails },
                phones: { create: phones },
            },
            include: {
                aliases: true,
                addresses: true,
                emails: true,
                phones: true,
            }
        });
    });

    await auditLog({
        actorId: userId,
        actorType: "USER",
        action: AUDIT_ACTION.IDENTITY_CREATED,
        entityType: "Identity",
        entityId: identity.id,
        ip,
    });

    return identity;
}

/**
 * Retrieves all identities for a user.
 */
export async function getUserIdentities(userId) {
    return prisma.identity.findMany({
        where: { userId },
        include: {
            aliases: true,
            addresses: true,
            emails: true,
            phones: true,
        },
        orderBy: { createdAt: "desc" }
    });
}

/**
 * Updates a specific identity record. Overwrites relations.
 */
export async function updateIdentity({ id, userId, data, ip }) {
    const identity = await prisma.identity.findUnique({
        where: { id, userId }
    });

    if (!identity) {
        throw new AppError("Identity not found.", 404, "NOT_FOUND");
    }

    const { aliases, addresses, emails, phones, ...coreData } = data;

    const updated = await prisma.$transaction(async (tx) => {
        // We delete all existing relations and recreate them to sync state
        if (aliases) await tx.identityAlias.deleteMany({ where: { identityId: id } });
        if (addresses) await tx.identityAddress.deleteMany({ where: { identityId: id } });
        if (emails) await tx.identityEmail.deleteMany({ where: { identityId: id } });
        if (phones) await tx.identityPhone.deleteMany({ where: { identityId: id } });

        return tx.identity.update({
            where: { id },
            data: {
                ...coreData,
                ...(aliases && { aliases: { create: aliases } }),
                ...(addresses && { addresses: { create: addresses } }),
                ...(emails && { emails: { create: emails } }),
                ...(phones && { phones: { create: phones } }),
            },
            include: {
                aliases: true,
                addresses: true,
                emails: true,
                phones: true,
            }
        });
    });

    await auditLog({
        actorId: userId,
        actorType: "USER",
        action: AUDIT_ACTION.IDENTITY_UPDATED,
        entityType: "Identity",
        entityId: updated.id,
        ip,
    });

    return updated;
}

/**
 * Safely soft-deletes or restricts an identity if attached to a request.
 * For this MVP, we do a hard delete if no active requests exist.
 */
export async function deleteIdentity({ id, userId, ip }) {
    const identity = await prisma.identity.findUnique({
        where: { id, userId },
        include: { _count: { select: { requests: true, recurringSchedules: true } } }
    });

    if (!identity) {
        throw new AppError("Identity not found.", 404, "NOT_FOUND");
    }

    if (identity._count.requests > 0 || identity._count.recurringSchedules > 0) {
        throw new AppError("Cannot delete an identity that has active privacy requests or recurring schedules. Delete the associated requests first.", 400, "DEPENDENCY_EXISTS");
    }

    await prisma.identity.delete({ where: { id } });

    await auditLog({
        actorId: userId,
        actorType: "USER",
        action: AUDIT_ACTION.IDENTITY_UPDATED,
        entityType: "Identity",
        entityId: id,
        ip,
        metadata: { deleted: true }
    });

    return { deleted: true };
}
