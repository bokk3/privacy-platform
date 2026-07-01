import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { createRequest } from "../../services/request.service.js";

/**
 * Sweeps the database for active recurring schedules whose nextRunAt has passed.
 * For each one, it evaluates if the user still has an active subscription, 
 * dispatches the privacy requests, and shifts the nextRunAt forward.
 */
export async function cronProcessor(job) {
    logger.info("Executing daily recurring schedule sweep...");

    // Find all schedules due for execution
    const schedules = await prisma.recurringSchedule.findMany({
        where: {
            active: true,
            nextRunAt: { lte: new Date() },
        },
        include: {
            user: { include: { subscription: true } },
            identity: { include: { aliases: true, addresses: true, emails: true, phones: true } },
        },
    });

    let processedCount = 0;
    let skippedCount = 0;

    for (const schedule of schedules) {
        // Evaluate entitlement constraints
        const sub = schedule.user.subscription;
        if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) {
            // Unsubscribe users who are no longer paying to avoid repeated failed sweeps
            await prisma.recurringSchedule.update({
                where: { id: schedule.id },
                data: { active: false },
            });
            logger.warn({ scheduleId: schedule.id }, "Deactivated schedule due to inactive subscription");
            skippedCount++;
            continue;
        }

        try {
            // Find all active brokers
            const brokers = await prisma.broker.findMany({
                where: { status: "ACTIVE" },
            });

            // Dispatch a privacy request for each broker on behalf of the user
            for (const broker of brokers) {
                await createRequest({
                    userId: schedule.userId,
                    identityId: schedule.identityId,
                    brokerId: broker.id,
                    ip: "127.0.0.1", // Admin/System execution IP
                });
            }

            // Immediately shift schedule forward by intervalDays
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + schedule.intervalDays);

            await prisma.recurringSchedule.update({
                where: { id: schedule.id },
                data: { nextRunAt: nextDate },
            });

            processedCount++;

        } catch (err) {
            logger.error({ err, scheduleId: schedule.id }, "Failed to process recurring schedule");
            skippedCount++;
        }
    }

    logger.info({ processedCount, skippedCount }, "Completed recurring schedule sweep");
    return { processedCount, skippedCount };
}
