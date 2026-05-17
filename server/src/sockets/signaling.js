/**
 * signaling.js
 * ─────────────────────────────────────────────────────────────────────────────
 * WebRTC signaling relay for PeerNexus.
 *
 * The server is a DUMB RELAY — it never inspects or processes SDP/ICE payloads.
 * It simply routes them from sender → target socket.
 *
 * This handles TWO use-cases:
 *  A) Matchmaking calls  — target is identified by roomId (from matchmaking.js)
 *  B) Direct P2P calls   — target is identified by userId (DM video call)
 *
 * CLIENT FLOW (WebRTC offer/answer)
 * ──────────────────────────────────
 *  Initiator                            Server                   Answerer
 *  ─────────────────────────────────────────────────────────────────────
 *  createPeerConnection()
 *  createOffer()
 *  setLocalDescription(offer)
 *  emit("webrtc:offer", { targetId, roomId, offer })
 *                                    → relay to target
 *                                                       setRemoteDescription(offer)
 *                                                       createAnswer()
 *                                                       setLocalDescription(answer)
 *                                                       emit("webrtc:answer", { targetId, roomId, answer })
 *                                    → relay to initiator
 *  setRemoteDescription(answer)
 *
 *  [ICE candidates trickled concurrently from both sides]
 *  emit("webrtc:ice-candidate", { targetId, roomId, candidate })
 *                                    → relay to target
 *                                                       addIceCandidate(candidate)
 *
 * EVENTS LISTENED (client → server)
 * ────────────────────────────────────
 *  webrtc:offer          { targetId, roomId?, offer }
 *  webrtc:answer         { targetId, roomId?, answer }
 *  webrtc:ice-candidate  { targetId, roomId?, candidate }
 *  webrtc:hangup         { targetId, roomId? }
 *  webrtc:call-user      { targetId }         — initiate a direct DM call
 *  webrtc:call-accepted  { targetId }         — callee accepts incoming call
 *  webrtc:call-rejected  { targetId }         — callee rejects incoming call
 *
 * EVENTS EMITTED (server → client)
 * ────────────────────────────────────
 *  webrtc:offer          { from, roomId?, offer }
 *  webrtc:answer         { from, roomId?, answer }
 *  webrtc:ice-candidate  { from, roomId?, candidate }
 *  webrtc:hangup         { from, roomId? }
 *  webrtc:incoming-call  { from, fromUser: { fullName, avatar } }
 *  webrtc:call-accepted  { from }
 *  webrtc:call-rejected  { from }
 */

import { User } from "../models/user.model.js";

// socketId ↔ userId registry — populated by the auth middleware in socketIndex.js
// Exported so matchmaking.js can also use it
export const socketUserMap = new Map(); // socketId → userId
export const userSocketMap = new Map(); // userId   → socketId

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Get the socketId of a user by their userId string.
 * Returns null if the user is offline.
 */
const getSocketId = (userId) => userSocketMap.get(userId?.toString()) ?? null;

/**
 * Relay a payload to a target socket identified by userId.
 * Adds `from` (sender's userId) to the relayed payload.
 */
const relay = (io, event, targetUserId, payload) => {
  const targetSocketId = getSocketId(targetUserId);
  if (!targetSocketId) return false;                // peer offline
  io.to(targetSocketId).emit(event, payload);
  return true;
};

/* ─── Main export ─────────────────────────────────────────────────────────── */
export const registerSignaling = (io, socket) => {
  const senderId = socket.data.userId;              // set by auth middleware

  // ── Register this socket in both maps ──────────────────────────────────────
  socketUserMap.set(socket.id, senderId);
  userSocketMap.set(senderId, socket.id);

  /* ── WebRTC Offer ────────────────────────────────────────────────────────── */
  socket.on("webrtc:offer", ({ targetId, roomId, offer }) => {
    if (!targetId || !offer) return;

    const delivered = relay(io, "webrtc:offer", targetId, {
      from: senderId,
      roomId,
      offer,
    });

    if (!delivered) {
      socket.emit("webrtc:peer-offline", { targetId, event: "offer" });
    }
  });

  /* ── WebRTC Answer ───────────────────────────────────────────────────────── */
  socket.on("webrtc:answer", ({ targetId, roomId, answer }) => {
    if (!targetId || !answer) return;

    relay(io, "webrtc:answer", targetId, {
      from: senderId,
      roomId,
      answer,
    });
  });

  /* ── ICE Candidate (trickle ICE) ─────────────────────────────────────────── */
  socket.on("webrtc:ice-candidate", ({ targetId, roomId, candidate }) => {
    if (!targetId || !candidate) return;

    relay(io, "webrtc:ice-candidate", targetId, {
      from: senderId,
      roomId,
      candidate,
    });
  });

  /* ── Hangup ──────────────────────────────────────────────────────────────── */
  socket.on("webrtc:hangup", ({ targetId, roomId }) => {
    if (!targetId) return;

    relay(io, "webrtc:hangup", targetId, {
      from: senderId,
      roomId,
    });

    // Update user status back to online
    User.findByIdAndUpdate(senderId, { status: "online" }).catch(() => {});
  });

  /* ── Direct call — ring the target user ──────────────────────────────────── */
  socket.on("webrtc:call-user", async ({ targetId }) => {
    if (!targetId) return;

    const targetOnline = !!getSocketId(targetId);
    if (!targetOnline) {
      return socket.emit("webrtc:peer-offline", {
        targetId,
        event: "call",
        message: "This user is currently offline.",
      });
    }

    // Fetch caller's profile to show on the ringing screen
    const callerInfo = await User.findById(senderId)
      .select("fullName userName avatar")
      .lean()
      .catch(() => null);

    relay(io, "webrtc:incoming-call", targetId, {
      from:     senderId,
      fromUser: callerInfo ?? { _id: senderId },
    });

    // Set caller status to in-call
    User.findByIdAndUpdate(senderId, { status: "in-call" }).catch(() => {});
  });

  /* ── Call accepted ───────────────────────────────────────────────────────── */
  socket.on("webrtc:call-accepted", ({ targetId }) => {
    if (!targetId) return;
    relay(io, "webrtc:call-accepted", targetId, { from: senderId });
    User.findByIdAndUpdate(senderId, { status: "in-call" }).catch(() => {});
  });

  /* ── Call rejected ───────────────────────────────────────────────────────── */
  socket.on("webrtc:call-rejected", ({ targetId }) => {
    if (!targetId) return;
    relay(io, "webrtc:call-rejected", targetId, { from: senderId });
  });

  /* ── Disconnect — clean up maps + reset status ───────────────────────────── */
  socket.on("disconnect", () => {
    socketUserMap.delete(socket.id);
    userSocketMap.delete(senderId);
    User.findByIdAndUpdate(senderId, {
      status:     "offline",
      lastSeenAt: new Date(),
    }).catch(() => {});
  });
};