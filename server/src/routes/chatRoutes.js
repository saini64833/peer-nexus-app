import express from "express";
import { upload } from "../middleware/multer.js";
import { verifyJwt} from "../middleware/requireAuth.js";
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  sendImageMessage,
  sendFileMetadata,
  markRead,
  deleteMessage,
  searchUsers,
} from "../controllers/chatController.js";

const router = express.Router();

// All chat routes require authentication
router.use(verifyJwt);

/* ── Conversations ──────────────────────────────────────────────────── */
router.get("/conversations",        getConversations);
router.post("/conversations",       getOrCreateConversation);

/* ── Messages ───────────────────────────────────────────────────────── */
router.get("/conversations/:conversationId/messages",         getMessages);
router.post("/conversations/:conversationId/messages",        sendMessage);

// Image upload (multipart)
router.post(
  "/conversations/:conversationId/messages/image",
  upload.single("image"),
  sendImageMessage
);

// P2P file metadata registration (JSON only — bytes travel via WebRTC)
router.post("/conversations/:conversationId/messages/file",   sendFileMetadata);

// Mark all as read
router.patch("/conversations/:conversationId/messages/read",  markRead);

// Soft-delete a message
router.delete(
  "/conversations/:conversationId/messages/:messageId",
  deleteMessage
);

/* ── User search ────────────────────────────────────────────────────── */
router.get("/users/search", searchUsers);

export default router;