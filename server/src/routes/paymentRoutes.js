import express from "express";
import { verifyJwt } from "../middleware/requireAuth.js";
import { stripeWebhookParser } from "../middleware/stripeWebhookParser.js";
import {
  createCheckoutSession,
  getSubscription,
  getBillingPortal,
  handleWebhook,
} from "../controllers/paymentController.js";

const router = express.Router();

// Stripe webhook — must use raw body parser, no auth
router.post("/webhook", stripeWebhookParser, handleWebhook);

// All other payment routes require auth
router.use(verifyJwt);
router.post("/checkout", createCheckoutSession);
router.get("/subscription", getSubscription);
router.post("/portal", getBillingPortal);

export default router;
