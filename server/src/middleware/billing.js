import { getSubscriptionStatus } from "../services/billing.service.js";
import { AppError } from "./errorHandler.js";

/**
 * Middleware to check if the user has an active or trialing subscription.
 * Blocks access to gated resources (like dispatching new privacy requests)
 * if the user is unpaid or canceled.
 */
export async function requireActiveSubscription(req, res, next) {
    try {
        const { active } = await getSubscriptionStatus(req.user.sub);

        if (!active) {
            throw new AppError("Active subscription required.", 403, "PAYMENT_REQUIRED");
        }

        next();
    } catch (err) {
        next(err);
    }
}
