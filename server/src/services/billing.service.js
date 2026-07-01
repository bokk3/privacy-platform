import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";

let stripe;

function getStripe() {
    if (!stripe) {
        if (!env.STRIPE_SECRET_KEY) {
            throw new AppError("Stripe is not configured.", 503, "BILLING_UNAVAILABLE");
        }
        stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });
    }
    return stripe;
}

// ---------------------------------------------------------------------------
// Customer management
// ---------------------------------------------------------------------------

async function ensureStripeCustomer(user) {
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { userId: user.id },
    });

    await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
    });

    return customer.id;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export async function createCheckoutSession(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found.", 404, "NOT_FOUND");

    const existingSub = await prisma.subscription.findUnique({ where: { userId } });
    if (existingSub && existingSub.status === "ACTIVE") {
        throw new AppError("You already have an active subscription.", 400, "ALREADY_SUBSCRIBED");
    }

    const customerId = await ensureStripeCustomer(user);

    const session = await getStripe().checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
        success_url: `${env.APP_URL}/billing?success=true`,
        cancel_url: `${env.APP_URL}/billing?canceled=true`,
        metadata: { userId: user.id },
    });

    return { url: session.url };
}

// ---------------------------------------------------------------------------
// Portal (manage existing subscription)
// ---------------------------------------------------------------------------

export async function createPortalSession(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
        throw new AppError("No billing account found.", 400, "NO_BILLING_ACCOUNT");
    }

    const session = await getStripe().billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${env.APP_URL}/billing`,
    });

    return { url: session.url };
}

// ---------------------------------------------------------------------------
// Subscription status
// ---------------------------------------------------------------------------

export async function getSubscriptionStatus(userId) {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return { active: false, subscription: null };

    return {
        active: sub.status === "ACTIVE" || sub.status === "TRIALING",
        subscription: {
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        },
    };
}

// ---------------------------------------------------------------------------
// Stripe webhook event processing
// ---------------------------------------------------------------------------

export async function handleStripeWebhook(rawBody, signature) {
    const s = getStripe();

    let event;
    try {
        event = s.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        logger.error({ err }, "Stripe webhook signature verification failed");
        throw new AppError("Invalid webhook signature.", 400, "INVALID_SIGNATURE");
    }

    logger.info({ type: event.type }, "Stripe webhook received");

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object;
            await handleCheckoutComplete(session);
            break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
            const subscription = event.data.object;
            await syncSubscription(subscription);
            break;
        }
        case "invoice.payment_failed": {
            const invoice = event.data.object;
            logger.warn({ customerId: invoice.customer }, "Payment failed");
            break;
        }
        default:
            logger.debug({ type: event.type }, "Unhandled Stripe event");
    }
}

async function handleCheckoutComplete(session) {
    const userId = session.metadata?.userId;
    if (!userId) {
        logger.warn("Checkout session missing userId metadata");
        return;
    }

    const stripeSubscription = await getStripe().subscriptions.retrieve(session.subscription);
    await upsertSubscription(userId, stripeSubscription);
}

async function syncSubscription(stripeSub) {
    // Find user by Stripe customer ID
    const user = await prisma.user.findFirst({
        where: { stripeCustomerId: stripeSub.customer },
    });

    if (!user) {
        logger.warn({ customerId: stripeSub.customer }, "No user found for Stripe customer");
        return;
    }

    await upsertSubscription(user.id, stripeSub);
}

function mapStripeStatus(status) {
    const mapping = {
        active: "ACTIVE",
        past_due: "PAST_DUE",
        canceled: "CANCELED",
        trialing: "TRIALING",
        unpaid: "UNPAID",
    };
    return mapping[status] || "CANCELED";
}

async function upsertSubscription(userId, stripeSub) {
    const data = {
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: stripeSub.items.data[0]?.price?.id || "",
        status: mapStripeStatus(stripeSub.status),
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end || false,
    };

    await prisma.subscription.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
    });

    logger.info({ userId, status: data.status }, "Subscription synced");
}
