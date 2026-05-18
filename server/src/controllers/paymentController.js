import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import stripe from "../db/stripe.js";

const ensureStripe = () => {
  if (!stripe) throw new ApiError(503, "Payment service is not configured.");
};

/* ── POST /payment/checkout ─────────────────────────────────────────────── */
export const createCheckoutSession = asyncHandler(async (req, res) => {
  ensureStripe();
  const { priceId } = req.body;
  if (!priceId) throw new ApiError(400, "priceId is required");

  const user = req.user;

  // Reuse or create a Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: { userId: user._id.toString() },
    });
    customerId = customer.id;
    await User.findByIdAndUpdate(user._id, { stripeCustomerId: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.CLIENT_URL}/dashboard?upgraded=1`,
    cancel_url: `${process.env.CLIENT_URL}/pricing?canceled=1`,
    metadata: { userId: user._id.toString() },
  });

  return res.status(200).json(new ApiResponse(200, { url: session.url }, "Checkout session created"));
});

/* ── GET /payment/subscription ──────────────────────────────────────────── */
export const getSubscription = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, sub ?? null, "Subscription fetched"));
});

/* ── POST /payment/portal ───────────────────────────────────────────────── */
export const getBillingPortal = asyncHandler(async (req, res) => {
  ensureStripe();
  const user = req.user;
  if (!user.stripeCustomerId) throw new ApiError(400, "No billing account found");

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/dashboard`,
  });

  return res.status(200).json(new ApiResponse(200, { url: session.url }, "Portal session created"));
});

/* ── POST /payment/webhook ──────────────────────────────────────────────── */
export const handleWebhook = asyncHandler(async (req, res) => {
  ensureStripe();
  const sig = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    throw new ApiError(400, `Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (userId && session.subscription) {
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
        await Subscription.findOneAndUpdate(
          { userId },
          {
            userId,
            stripeSubscriptionId: session.subscription,
            planType: "premium",
            status: stripeSub.status,
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
          { upsert: true, new: true }
        );
        await User.findByIdAndUpdate(userId, { isPremium: true });
      }
      break;
    }
    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const dbSub = await Subscription.findOne({ stripeSubscriptionId: sub.id });
      if (dbSub) {
        dbSub.status = sub.status;
        dbSub.currentPeriodEnd = new Date(sub.current_period_end * 1000);
        await dbSub.save();
        const active = sub.status === "active";
        await User.findByIdAndUpdate(dbSub.userId, { isPremium: active });
      }
      break;
    }
    default:
      break;
  }

  return res.status(200).json({ received: true });
});
