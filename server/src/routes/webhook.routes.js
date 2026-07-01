import { Router } from "express";
import * as webhookService from "../services/webhook.service.js";
import { logger } from "../lib/logger.js";

export const webhookRouter = Router();

// Endpoint for receiving generic email webhooks (e.g. from Sendgrid / Mailgun)
webhookRouter.post("/email", async (req, res, next) => {
    try {
        // In production, you would verify webhook hashes here (e.g., Sendgrid Event Webhook signatures).

        // Convert vendor-specific payloads to a normalized object. 
        // This example assumes a normalized generic structure received.
        const { from, to, subject, text, event } = req.body;
        const isBounce = event === "bounce" || event === "dropped";

        // We send an immediate 200 OK so the email provider doesn't retry
        res.status(200).send("OK");

        // Process asynchronously so we don't stall the HTTP response
        webhookService.processEmailWebhook({
            from,
            to,
            subject,
            text,
            isBounce,
        }).catch(err => {
            logger.error({ err }, "Error processing inbound webhook asynchronously");
        });

    } catch (err) {
        next(err);
    }
});
