import express from "express";

/**
 * stripeWebhookParser
 * Stripe requires the raw request body (Buffer) for signature verification.
 * Attach this middleware BEFORE express.json() on the webhook route.
 */
export const stripeWebhookParser = express.raw({ type: "application/json" });
