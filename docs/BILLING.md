# Stripe Monetization Setup

This document describes how Opaca Engine integrates with Stripe for subscription billing, and how to configure it for development and production.

## 1. Overview

Opaca Engine gates privacy-request workflows behind an active Stripe subscription. The billing flow is:

1. User clicks **Subscribe** → API creates a Stripe Checkout Session → user is redirected to Stripe-hosted payment page.
2. On successful payment, Stripe fires a `checkout.session.completed` webhook → the API upserts a `Subscription` record.
3. Subsequent subscription lifecycle events (`updated`, `deleted`, `invoice.payment_failed`) are synced automatically via the same webhook endpoint.
4. Users can manage their subscription (cancel, update payment method) through a Stripe Customer Portal session.

## 2. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes | Your Stripe secret API key (`sk_test_…` or `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (`whsec_…`) from the Stripe Dashboard |
| `STRIPE_PRICE_ID` | Yes | The Stripe Price ID (`price_…`) for the subscription product |
| `APP_URL` | Yes | Public frontend URL — used for Checkout success/cancel redirects |

All three Stripe variables default to empty strings, so the server will boot without them, but any call to the billing endpoints will return a `503 BILLING_UNAVAILABLE` error until they are set.

## 3. Stripe Dashboard Setup

### Create a Product & Price

1. In the [Stripe Dashboard](https://dashboard.stripe.com/products), create a new **Product** (e.g. "Opaca Engine Pro").
2. Add a recurring **Price** (e.g. $11.99/month).
3. Copy the `price_…` ID into `STRIPE_PRICE_ID`.

### Configure the Webhook

1. Go to **Developers → Webhooks → Add endpoint**.
2. Set the endpoint URL to `https://<your-domain>/api/billing/webhook`.
3. Select the following events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### Enable the Customer Portal

1. Go to **Settings → Billing → Customer portal**.
2. Enable the features you want (cancel subscription, update payment method, etc.).
3. No additional env configuration is needed — the API uses `billingPortal.sessions.create` directly.

## 4. API Endpoints

All billing routes are mounted at `/api/billing`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/status` | Bearer JWT | Returns current subscription status |
| `POST` | `/checkout` | Bearer JWT | Creates a Stripe Checkout Session, returns `{ url }` |
| `POST` | `/portal` | Bearer JWT | Creates a Stripe Customer Portal Session, returns `{ url }` |
| `POST` | `/webhook` | None (Stripe signature) | Receives Stripe webhook events |

## 5. Data Model

The `subscriptions` table tracks the billing state:

```
model Subscription {
  id                     String             @id @default(uuid())
  userId                 String             @unique
  stripeSubscriptionId   String             @unique
  stripePriceId          String
  status                 SubscriptionStatus  // ACTIVE | PAST_DUE | CANCELED | TRIALING | UNPAID
  currentPeriodStart     DateTime
  currentPeriodEnd       DateTime
  cancelAtPeriodEnd      Boolean            @default(false)
}
```

The `User` model holds an optional `stripeCustomerId` field that is lazily created the first time a user initiates checkout.

## 6. Subscription Status Mapping

Stripe statuses are mapped to Prisma enum values:

| Stripe Status | Opaca Status |
|---|---|
| `active` | `ACTIVE` |
| `past_due` | `PAST_DUE` |
| `canceled` | `CANCELED` |
| `trialing` | `TRIALING` |
| `unpaid` | `UNPAID` |
| *(anything else)* | `CANCELED` |

## 7. Local Development with Stripe CLI

For local development, use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhook events:

```bash
# Install (macOS example)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to your local server
stripe listen --forward-to localhost:4000/api/billing/webhook
```

The CLI will print a webhook signing secret (`whsec_…`). Use this as `STRIPE_WEBHOOK_SECRET` in your `.env`.

## 8. Webhook Security

The webhook endpoint verifies every incoming request using `stripe.webhooks.constructEvent()` with the `STRIPE_WEBHOOK_SECRET`. Requests with invalid or missing signatures are rejected with a `400 INVALID_SIGNATURE` error.

> **Important:** The webhook route requires the raw request body for signature verification. This is captured by the `verify` callback in the Express `express.json()` middleware configured in `server/src/app.js`.
