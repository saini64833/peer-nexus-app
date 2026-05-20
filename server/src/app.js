import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { handleWebhook } from "./controllers/paymentController.js";

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowedOrigins = (process.env.CORS_ORIGIN || "")
        .split(",")
        .map((o) => o.trim());

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

/* ================= STRIPE WEBHOOK ONLY ================= */

app.post(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

/* ======================================================= */

/* NORMAL MIDDLEWARE */
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(cookieParser());

/* ROUTES */
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/chat", chatRoutes);

export { app };