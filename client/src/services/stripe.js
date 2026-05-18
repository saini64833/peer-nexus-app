/**
 * stripe.js — client-side Stripe utilities.
 *
 * Stripe Checkout is handled server-side (see paymentApi in api.js).
 * This file exposes a helper to redirect to the Stripe Customer Portal.
 */
import { paymentApi } from "./api";

/**
 * Redirect the current user to Stripe's billing portal.
 * The server creates the portal session and returns the URL.
 */
export async function openBillingPortal() {
  const { data } = await paymentApi.getBillingPortal();
  const url = data?.data?.url;
  if (url) {
    window.location.href = url;
  } else {
    throw new Error("Could not open billing portal");
  }
}
