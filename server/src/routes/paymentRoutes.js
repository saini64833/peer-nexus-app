import { Router } from "express";
import express from "express";
import { verifyJwt } from "../middleware/requireAuth.js";
// import { stripeWebhookParser } from "../middleware/stripeWebhookParser.js";
import {
  createCheckoutSession,
  getSubscription,
  getBillingPortal,
  handleWebhook,
} from "../controllers/paymentController.js";

const router = Router();

/* webhook route FIRST */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

/* protected routes */
router.post("/checkout", verifyJwt, createCheckoutSession);
router.get("/subscription", verifyJwt, getSubscription);
router.post("/portal", verifyJwt, getBillingPortal);

export default router;