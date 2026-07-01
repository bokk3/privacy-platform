import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { REQUEST_STATUS, BROKER_STATUS } from "@opaca-engine/shared";

/**
 * Grabs high level health metrics about the broker/queues system
 */
export async function getSystemHealth() {
    const usersCount = await prisma.user.count();
    const brokersCount = await prisma.broker.count();
    const requestsCount = await prisma.privacyRequest.count();
    const failedRequests = await prisma.privacyRequest.count({
        where: { status: REQUEST_STATUS.FAILED },
    });

    const activeBrokers = await prisma.broker.count({
        where: { status: BROKER_STATUS.ACTIVE },
    });

    // Pull BullMQ Queue sizes natively from Redis or estimate
    // For brevity, we just pull the DB active queries instead of spinning BullMQ abstractions.
    const inFlightCount = await prisma.privacyRequest.count({
        where: { status: { in: [REQUEST_STATUS.PENDING, REQUEST_STATUS.WAITING, REQUEST_STATUS.SENT] } },
    });

    return {
        users: usersCount,
        brokers: brokersCount,
        activeBrokers,
        requests: requestsCount,
        failedRequests,
        inFlightCount,
        databaseStatus: "connected",
        redisStatus: redis.status === "ready" ? "connected" : "disconnected",
    };
}

export async function getUsersList(take = 50, skip = 0) {
    return prisma.user.findMany({
        take,
        skip,
        select: {
            id: true,
            email: true,
            role: true,
            mfaEnabled: true,
            emailVerifiedAt: true,
            createdAt: true,
            identities: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function getBrokersList() {
    return prisma.broker.findMany({
        orderBy: { name: "asc" },
    });
}

export async function updateBroker(brokerId, data) {
    return prisma.broker.update({
        where: { id: brokerId },
        data,
    });
}

export async function createBroker(data) {
    return prisma.broker.create({ data });
}

export async function getAuditLogs(take = 100) {
    return prisma.auditLog.findMany({
        take,
        orderBy: { createdAt: "desc" },
        include: {
            user: { select: { email: true } }
        }
    });
}
