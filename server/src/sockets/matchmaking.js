/**
 * matchmaking.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Omegle-style random video matchmaking via Socket.io.
 *
 * FLOW
 * ────
 *  1. Premium user emits  "matchmaking:join"
 *  2. Server checks waiting queue
 *     • Queue empty  → add user to queue, emit "matchmaking:waiting"
 *     • Queue has peer → dequeue peer, create a shared roomId,
 *       emit "matchmaking:matched" to BOTH with { roomId, peerId, initiator }
 *  3. Both clients open a WebRTC connection (signaling handled by signaling.js)
 *  4. Either user emits "matchmaking:skip"  → destroy room, re-queue or idle
 *  5. Either user emits "matchmaking:leave" → destroy room cleanly
 *  6. On disconnect → auto-cleanup queue + notify peer
 *
 * DATA STRUCTURES (in-memory, single-process)
 * ────────────────────────────────────────────
 *  waitingQueue : Array<{ socketId, userId, joinedAt }>
 *  activeRooms  : Map<roomId, { socketIds: [a, b], userIds: [a, b], createdAt }>
 *  userRoom     : Map<socketId, roomId>   — O(1) lookup "which room is this socket in?"
 */

import { v4 as uuid } from "uuid";
import { User }       from "../models/user.model.js";

// ── Shared in-process state ───────────────────────────────────────────────────
const waitingQueue = [];          // [{ socketId, userId, joinedAt }]
const activeRooms  = new Map();   // roomId → { socketIds, userIds, createdAt }
const userRoom     = new Map();   // socketId → roomId

// ── Helpers ───────────────────────────────────────────────────────────────────
const dequeue = (socketId) => {
  const idx = waitingQueue.findIndex((e) => e.socketId === socketId);
  if (idx !== -1) waitingQueue.splice(idx, 1);
};

const createRoom = (socketA, userA, socketB, userB) => {
  const roomId = `mm-${uuid()}`;
  activeRooms.set(roomId, {
    socketIds: [socketA, socketB],
    userIds:   [userA,   userB],
    createdAt: Date.now(),
  });
  userRoom.set(socketA, roomId);
  userRoom.set(socketB, roomId);
  return roomId;
};

const destroyRoom = (roomId) => {
  const room = activeRooms.get(roomId);
  if (!room) return null;
  room.socketIds.forEach((sid) => userRoom.delete(sid));
  activeRooms.delete(roomId);
  return room;
};

// ── Main export ───────────────────────────────────────────────────────────────
export const registerMatchmaking = (io, socket) => {
  const { userId, isPremium } = socket.data; // set by auth middleware

  /* ── join queue ─────────────────────────────────────────────────────────── */
  socket.on("matchmaking:join", async () => {
    // Premium gate
    if (!isPremium) {
      return socket.emit("matchmaking:error", {
        code:    "NOT_PREMIUM",
        message: "Video matchmaking is a Premium feature. Upgrade to access it.",
      });
    }

    // Don't double-queue or double-room
    if (userRoom.has(socket.id)) {
      return socket.emit("matchmaking:error", {
        code:    "ALREADY_IN_ROOM",
        message: "You are already in a session.",
      });
    }
    if (waitingQueue.some((e) => e.socketId === socket.id)) {
      return socket.emit("matchmaking:waiting", { position: waitingQueue.length });
    }

    // Find a waiting peer (not self)
    const peerIdx = waitingQueue.findIndex((e) => e.userId !== userId);

    if (peerIdx === -1) {
      // No match available — join the queue
      waitingQueue.push({ socketId: socket.id, userId, joinedAt: Date.now() });
      socket.emit("matchmaking:waiting", { position: waitingQueue.length });
      console.log(`[MM] ${userId} joined queue. Queue size: ${waitingQueue.length}`);
      return;
    }

    // Match found
    const peer = waitingQueue.splice(peerIdx, 1)[0];
    const roomId = createRoom(socket.id, userId, peer.socketId, peer.userId);

    // Both join the socket room for signaling
    socket.join(roomId);
    io.sockets.sockets.get(peer.socketId)?.join(roomId);

    // Fetch lightweight user info for display on both ends
    const [meInfo, peerInfo] = await Promise.allSettled([
      User.findById(userId).select("fullName userName avatar").lean(),
      User.findById(peer.userId).select("fullName userName avatar").lean(),
    ]);

    const me   = meInfo.status   === "fulfilled" ? meInfo.value   : { _id: userId };
    const them = peerInfo.status === "fulfilled" ? peerInfo.value : { _id: peer.userId };

    // Tell the initiator (the one who just joined) to create the RTCPeerConnection offer
    socket.emit("matchmaking:matched", {
      roomId,
      peer:      them,
      initiator: true,   // this client sends the WebRTC offer
    });

    // Tell the waiting peer — they answer the offer
    io.to(peer.socketId).emit("matchmaking:matched", {
      roomId,
      peer:      me,
      initiator: false,  // this client waits for the offer
    });

    console.log(`[MM] Matched ${userId} ↔ ${peer.userId} in room ${roomId}`);
  });

  /* ── skip peer — end current session and re-enter queue ────────────────── */
  socket.on("matchmaking:skip", () => {
    const roomId = userRoom.get(socket.id);
    if (!roomId) return;

    const room = destroyRoom(roomId);
    if (!room) return;

    // Notify the other peer
    const otherSocketId = room.socketIds.find((id) => id !== socket.id);
    if (otherSocketId) {
      io.to(otherSocketId).emit("matchmaking:peer_left", {
        reason: "skipped",
        message: "Your peer skipped to the next session.",
      });
    }

    // Both leave the socket room
    socket.leave(roomId);
    io.sockets.sockets.get(otherSocketId)?.leave(roomId);

    console.log(`[MM] ${userId} skipped in room ${roomId}`);

    // Auto re-queue the skipper
    socket.emit("matchmaking:skipping");
    // Small delay so the client can reset its UI before getting a new match
    setTimeout(() => {
      if (io.sockets.sockets.get(socket.id)) {
        socket.emit("matchmaking:join"); // self-trigger re-queue
        waitingQueue.push({ socketId: socket.id, userId, joinedAt: Date.now() });
        socket.emit("matchmaking:waiting", { position: waitingQueue.length });
      }
    }, 800);
  });

  /* ── leave — clean exit ─────────────────────────────────────────────────── */
  socket.on("matchmaking:leave", () => {
    _cleanupSocket(io, socket.id, userId, "left");
  });

  /* ── disconnect — same cleanup ──────────────────────────────────────────── */
  socket.on("disconnect", () => {
    _cleanupSocket(io, socket.id, userId, "disconnected");
  });
};

/* ── Internal cleanup ────────────────────────────────────────────────────── */
function _cleanupSocket(io, socketId, userId, reason) {
  // Remove from queue if waiting
  dequeue(socketId);

  // Destroy active room if in one
  const roomId = userRoom.get(socketId);
  if (roomId) {
    const room = destroyRoom(roomId);
    if (room) {
      const otherSocketId = room.socketIds.find((id) => id !== socketId);
      if (otherSocketId) {
        io.to(otherSocketId).emit("matchmaking:peer_left", {
          reason,
          message: reason === "disconnected"
            ? "Your peer lost connection."
            : "Your peer ended the session.",
        });
      }
      io.sockets.sockets.get(socketId)?.leave(roomId);
      io.sockets.sockets.get(otherSocketId)?.leave(roomId);
    }
  }

  console.log(`[MM] Cleaned up ${userId} (${reason}). Queue: ${waitingQueue.length}`);
}

// Expose for monitoring/admin endpoints if needed
export const getMatchmakingStats = () => ({
  waiting:     waitingQueue.length,
  activeRooms: activeRooms.size,
  queue:       waitingQueue.map((e) => ({ userId: e.userId, waitMs: Date.now() - e.joinedAt })),
});