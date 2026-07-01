import { Router } from "express";
import * as webhookService from "../services/webhook.service.js";
import { logger } from "../lib/logger.js";

export const webhookRouter = Router();

// Endpoint for receiving generic email webhooks (e.g. from SendGrid / Mailgun)
webhookRouter.post("/email", async (req, res, next) => {
    try {
        // In production, verify webhook signatures here (e.g., SendGrid Event Webhook HMAC).

        // Normalize vendor-specific payloads into a standard shape.
        const {
            from,
            to,
            subject,
            text,
            event,
            // Threading headers
            in_reply_to,    // SendGrid naming
            inReplyTo,      // Mailgun naming
            references,
            // Bounce metadata
            bounce_type,
            status,
            "message-id": rawMessageId,
        } = req.body;

        const isBounce = event === "bounce" || event === "dropped" || event === "bounced";

        // Immediate 200 so the provider doesn't retry
        res.status(200).send("OK");

        // Process asynchronously
        webhookService.processEmailWebhook({
            from,
            to,
            subject,
            text,
            isBounce,
            bounceType: bounce_type,
            statusCode: status,
            inReplyTo: inReplyTo || in_reply_to,
            references,
            messageId: rawMessageId,
        }).catch(err => {
            logger.error({ err }, "Error processing inbound webhook asynchronously");
        });

    } catch (err) {
        next(err);
    }
});

