import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowedOrigins = process.env.CORS_ORIGIN;

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/chats", chatRoutes);
export {app};