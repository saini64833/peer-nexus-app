/**
 * socketIndex.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the Socket.io server, authenticates every connection via JWT from
 * the httpOnly cookie, then delegates to the three feature handlers:
 *  - chatSocket.js      (messaging + presence)
 *  - signaling.js       (WebRTC offer/answer/ICE relay)
 *  - matchmaking.js     (Omegle-style queue)
 */

import { Server }              from "socket.io";
import jwt                     from "jsonwebtoken";
import cookieParser            from "cookie-parser";
import { User }                from "../models/user.model.js";
import { registerChat }        from "./chatSocket.js";
import { registerSignaling }   from "./signaling.js";
import { registerMatchmaking } from "./matchmaking.js";

/**
 * initSocket(httpServer)
 * Call this once in index.js after the HTTP server is created.
 * Returns the io instance (also stored on app via app.set("io", io)).
 */
export const initSocket = (httpServer, app) => {
  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
      methods:     ["GET", "POST"],
    },
    // Use websocket first; fall back to polling only if needed
    transports:        ["websocket", "polling"],
    pingInterval:      25_000,
    pingTimeout:       60_000,
    maxHttpBufferSize: 1e6, // 1 MB max payload per event
  });

  // Make io accessible from route handlers via req.app.get("io")
  app.set("io", io);

  /* ── Auth middleware — runs before every connection ──────────────────────── */
  io.use(async (socket, next) => {
    try {
      // Parse the request cookies manually (socket.handshake.headers.cookie)
      const rawCookie = socket.handshake.headers.cookie || "";
      const cookies   = parseCookies(rawCookie);
      const token     = cookies.accessToken;

      if (!token) {
        return next(new Error("AUTH_MISSING: No access token in cookies."));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      // Hydrate from DB — ensures user still exists and is not banned
      const user = await User.findById(decoded._id)
        .select("_id fullName userName isPremium status")
        .lean();

      if (!user) {
        return next(new Error("AUTH_INVALID: User not found."));
      }

      // Attach to socket so handlers can read socket.data.userId etc.
      socket.data.userId    = user._id.toString();
      socket.data.isPremium = user.isPremium;
      socket.data.fullName  = user.fullName;

      next();
    } catch (err) {
      console.error("[Socket auth]", err.message);
      next(new Error("AUTH_FAILED: " + err.message));
    }
  });

  /* ── Connection handler ──────────────────────────────────────────────────── */
  io.on("connection", (socket) => {
    const { userId, fullName } = socket.data;
    console.log(`[Socket] ${fullName} (${userId}) connected — ${socket.id}`);

    // Register all three feature namespaces on the same socket
    registerChat(io, socket);
    registerSignaling(io, socket);
    registerMatchmaking(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] ${fullName} (${userId}) disconnected — ${reason}`);
    });

    socket.on("error", (err) => {
      console.error(`[Socket error] ${socket.id}:`, err.message);
    });
  });

  /* ── Catch-all for auth rejections ──────────────────────────────────────── */
  io.on("connect_error", (err) => {
    console.error("[Socket connect_error]", err.message);
  });

  console.log("[Socket] Socket.io initialized");
  return io;
};

/* ─── Tiny cookie string parser ──────────────────────────────────────────── */
function parseCookies(cookieHeader) {
  return cookieHeader.split(";").reduce((acc, pair) => {
    const [k, ...v] = pair.trim().split("=");
    if (k) acc[k.trim()] = decodeURIComponent(v.join("=").trim());
    return acc;
  }, {});
}