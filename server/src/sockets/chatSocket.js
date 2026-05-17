/**
 * chatSocket.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time chat layer for PeerNexus — works alongside chatController.js
 * (REST handles persistence; sockets handle live delivery + presence).
 *
 * EVENTS LISTENED (client → server)
 * ────────────────────────────────────
 *  chat:join          { conversationId }
 *  chat:leave         { conversationId }
 *  chat:message       { conversationId, content }
 *  chat:typing        { conversationId, isTyping }
 *  chat:read          { conversationId }
 *  chat:file_incoming { conversationId, fileName, fileSize, mimeType, transferId }
 *
 * EVENTS EMITTED (server → client)
 * ────────────────────────────────────
 *  chat:message         — new message object (persisted)
 *  chat:typing          — { conversationId, userId, isTyping }
 *  chat:read            — { conversationId, readBy }
 *  chat:file_incoming   — file metadata + transferId
 *  chat:error           — { code, message }
 *
 * PRESENCE EVENTS (broadcast globally)
 * ──────────────────────────────────────
 *  presence:online_users  — [userId, ...] on connect
 *  presence:user_online   — userId
 *  presence:user_offline  — userId
 */

import { Conversation } from "../models/conversation.model.js";
import { Message }      from "../models/message.model.js";
import { User }         from "../models/user.model.js";
import { markMessagesAsRead } from "../controllers/chatController.js";
import { userSocketMap }      from "./signaling.js";

/* ─── Track all currently online userIds ─────────────────────────────────── */
const onlineSet = new Set(); // userId strings

export const registerChat = (io, socket) => {
  const userId = socket.data.userId;

  /* ── Presence: user came online ─────────────────────────────────────────── */
  onlineSet.add(userId);
  User.findByIdAndUpdate(userId, { status: "online" }).catch(() => {});

  // Tell the connecting socket who is online right now
  socket.emit("presence:online_users", [...onlineSet]);

  // Tell everyone else this user is online
  socket.broadcast.emit("presence:user_online", userId);

  /* ── Join a conversation room ────────────────────────────────────────────── */
  socket.on("chat:join", async ({ conversationId }) => {
    if (!conversationId) return;

    // Guard: user must be a member
    const conv = await Conversation.findOne({
      _id:       conversationId,
      memberIds: userId,
    }).lean();

    if (!conv) {
      return socket.emit("chat:error", {
        code:    "NOT_MEMBER",
        message: "You are not a member of this conversation.",
      });
    }

    socket.join(conversationId);

    // Mark messages as read when entering the room
    markMessagesAsRead(conversationId, userId).catch(() => {});

    // Notify others that this user has read
    socket.to(conversationId).emit("chat:read", {
      conversationId,
      readBy: userId,
    });
  });

  /* ── Leave a conversation room ───────────────────────────────────────────── */
  socket.on("chat:leave", ({ conversationId }) => {
    if (!conversationId) return;
    socket.leave(conversationId);
  });

  /* ── Send a message via socket (real-time path) ──────────────────────────── */
  socket.on("chat:message", async ({ conversationId, content }) => {
    if (!conversationId || !content?.trim()) {
      return socket.emit("chat:error", {
        code:    "INVALID_PAYLOAD",
        message: "conversationId and content are required.",
      });
    }

    try {
      // Verify membership
      const conv = await Conversation.findOne({
        _id:       conversationId,
        memberIds: userId,
      });
      if (!conv) {
        return socket.emit("chat:error", {
          code:    "NOT_MEMBER",
          message: "You are not a member of this conversation.",
        });
      }

      // Persist
      const message = await Message.create({
        conversationId,
        senderId: userId,
        type:     "text",
        content:  content.trim(),
      });

      const populated = await message.populate(
        "senderId",
        "fullName userName avatar"
      );

      // Update conversation lastMessage + unread counts for offline members
      const otherMembers = conv.memberIds.filter(
        (id) => id.toString() !== userId
      );
      const unreadUpdate = {};
      otherMembers.forEach((id) => {
        unreadUpdate[`unreadCounts.${id}`] =
          (conv.unreadCounts?.get?.(id.toString()) ?? 0) + 1;
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          lastMessage: {
            text:     content.trim(),
            senderId: userId,
            sentAt:   new Date(),
          },
          ...unreadUpdate,
        },
      });

      // Broadcast to room (including sender for confirmation)
      io.to(conversationId).emit("chat:message", populated);
    } catch (err) {
      console.error("[Chat socket] sendMessage error:", err.message);
      socket.emit("chat:error", {
        code:    "SERVER_ERROR",
        message: "Failed to send message.",
      });
    }
  });

  /* ── Typing indicator ────────────────────────────────────────────────────── */
  socket.on("chat:typing", ({ conversationId, isTyping }) => {
    if (!conversationId) return;
    // Broadcast to the room but NOT back to the sender
    socket.to(conversationId).emit("chat:typing", {
      conversationId,
      userId,
      isTyping: !!isTyping,
    });
  });

  /* ── Mark messages as read ───────────────────────────────────────────────── */
  socket.on("chat:read", async ({ conversationId }) => {
    if (!conversationId) return;
    await markMessagesAsRead(conversationId, userId).catch(() => {});
    socket.to(conversationId).emit("chat:read", {
      conversationId,
      readBy: userId,
    });
  });

  /* ── P2P file transfer metadata broadcast ────────────────────────────────── */
  socket.on(
    "chat:file_incoming",
    async ({ conversationId, fileName, fileSize, mimeType, transferId }) => {
      if (!conversationId || !fileName || !transferId) {
        return socket.emit("chat:error", {
          code:    "INVALID_PAYLOAD",
          message: "conversationId, fileName, and transferId are required.",
        });
      }

      try {
        const conv = await Conversation.findOne({
          _id:       conversationId,
          memberIds: userId,
        });
        if (!conv) return;

        // Save metadata record
        const message = await Message.create({
          conversationId,
          senderId: userId,
          type:     "file",
          content:  "",
          fileMetadata: { fileName, fileSize, mimeType, transferId },
        });

        const populated = await message.populate(
          "senderId",
          "fullName userName avatar"
        );

        // Update lastMessage preview
        const sizeLabel =
          fileSize > 1024 * 1024
            ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
            : `${(fileSize / 1024).toFixed(0)} KB`;

        await Conversation.findByIdAndUpdate(conversationId, {
          $set: {
            lastMessage: {
              text:     `📁 ${fileName} (${sizeLabel})`,
              senderId: userId,
              sentAt:   new Date(),
            },
          },
        });

        // Notify the room — receivers open a WebRTC DataChannel using transferId
        io.to(conversationId).emit("chat:file_incoming", {
          message:    populated,
          transferId,
          fileName,
          fileSize,
          mimeType,
          senderId:   userId,
        });
      } catch (err) {
        console.error("[Chat socket] file_incoming error:", err.message);
      }
    }
  );

  /* ── Disconnect — presence cleanup ──────────────────────────────────────── */
  socket.on("disconnect", () => {
    onlineSet.delete(userId);
    User.findByIdAndUpdate(userId, {
      status:     "offline",
      lastSeenAt: new Date(),
    }).catch(() => {});
    io.emit("presence:user_offline", userId);
  });
};

export const getOnlineUsers = () => [...onlineSet];