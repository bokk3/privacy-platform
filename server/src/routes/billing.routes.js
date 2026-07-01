import { Router } from "express";
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import * as billingService from "../services/billing.service.js";

export const billingRouter = Router();

// ---------------------------------------------------------------------------
// Authenticated routes
// ---------------------------------------------------------------------------

billingRouter.get("/status", requireAuth, async (req, res, next) => {
    try {
        const result = await billingService.getSubscriptionStatus(req.user.sub);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

billingRouter.post("/checkout", requireAuth, async (req, res, next) => {
    try {
        const result = await billingService.createCheckoutSession(req.user.sub);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

billingRouter.post("/portal", requireAuth, async (req, res, next) => {
    try {
        const result = await billingService.createPortalSession(req.user.sub);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// Stripe webhook (needs raw body captured by app.js express.json verify block)
// ---------------------------------------------------------------------------

billingRouter.post("/webhook", async (req, res, next) => {
    try {
        const signature = req.headers["stripe-signature"];
        // Ensure req.rawBody is available (set in app.js)
        if (!req.rawBody) {
            throw new Error("Raw body missing. Webhook parser misconfigured.");
        }
        await billingService.handleStripeWebhook(req.rawBody, signature);
        res.status(200).json({ received: true });
    } catch (err) {
        next(err);
    }
});
