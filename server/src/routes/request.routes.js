import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireVerifiedEmail } from "../middleware/auth.js";
import { requireActiveSubscription } from "../middleware/billing.js";
import { createRequestSchema, getRequestsQuerySchema } from "../schemas/request.schemas.js";
import * as requestService from "../services/request.service.js";

export const requestRouter = Router();

// Protect all request routes with authentication
requestRouter.use(requireAuth);

/**
 * Get all requests for the current user.
 */
requestRouter.get("/", validate(getRequestsQuerySchema, "query"), async (req, res, next) => {
    try {
        const result = await requestService.getRequests(req.user.sub, req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * Creates a new privacy request for the current user and enqueues it.
 */
requestRouter.post(
    "/",
    requireVerifiedEmail, // Prevent unverified users from spamming requests
    requireActiveSubscription, // Only paying customers can dispatch
    validate(createRequestSchema),
    async (req, res, next) => {
        try {
            const result = await requestService.createRequest({
                ...req.body,
                userId: req.user.sub,
                ip: req.ip,
            });
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }
);

/**
 * Fetch the timeline of events for a given request.
 */
requestRouter.get("/:id/timeline", async (req, res, next) => {
    try {
        const events = await requestService.getRequestActivity(req.params.id, req.user.sub);
        res.json(events);
    } catch (err) {
        next(err);
    }
});
