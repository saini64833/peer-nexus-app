import { asyncHandler }  from "../utils/asyncHandler.js";
import { ApiError }       from "../utils/apiError.js";
import { ApiResponse }    from "../utils/apiResponse.js";
import { User }           from "../models/user.model.js";
import { Conversation }   from "../models/conversation.model.js";
import { Message }        from "../models/message.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import mongoose           from "mongoose";

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER — mark messages as read (also called from socket layer)
═══════════════════════════════════════════════════════════════════════════ */
export const markMessagesAsRead = async (conversationId, userId) => {
  await Message.updateMany(
    {
      conversationId,
      senderId: { $ne: userId },
      isRead: false,
      deletedAt: null,
    },
    { $set: { isRead: true } }
  );

  // Reset unread counter for this user in the conversation
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { [`unreadCounts.${userId}`]: 0 },
  });
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /conversations
   Returns all conversations for the logged-in user, newest first.
   Each conversation is populated with the other participant's profile
   and the last message preview.
═══════════════════════════════════════════════════════════════════════════ */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({ memberIds: userId })
    .sort({ updatedAt: -1 })
    .populate({
      path: "memberIds",
      select: "fullName userName avatar status lastSeenAt",
    })
    .lean();

  // Shape the response so the client gets a clean "otherUser" field
  const shaped = conversations.map((conv) => {
    const otherParticipants = conv.memberIds.filter(
      (m) => m._id.toString() !== userId.toString()
    );
    const unreadCount =
      conv.unreadCounts?.[userId.toString()] ?? 0;

    return {
      _id:               conv._id,
      isGroup:           conv.isGroup,
      participants:      conv.memberIds,
      otherUser:         otherParticipants[0] ?? null, // for DMs
      lastMessage:       conv.lastMessage,
      unreadCount,
      updatedAt:         conv.updatedAt,
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, shaped, "Conversations fetched"));
});

/* ═══════════════════════════════════════════════════════════════════════════
   POST /conversations
   Get or create a 1-on-1 conversation with another user.
   Body: { participantId }
═══════════════════════════════════════════════════════════════════════════ */
export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const senderId    = req.user._id;
  const { participantId } = req.body;

  if (!participantId) throw new ApiError(400, "participantId is required");
  if (participantId === senderId.toString())
    throw new ApiError(400, "Cannot create a conversation with yourself");

  const targetUser = await User.findById(participantId).select("_id fullName userName");
  if (!targetUser) throw new ApiError(404, "User not found");

  // Check if a 1-on-1 conversation already exists between these two users
  let conversation = await Conversation.findOne({
    isGroup: false,
    memberIds: { $all: [senderId, participantId], $size: 2 },
  }).populate("memberIds", "fullName userName avatar status lastSeenAt");

  if (!conversation) {
    conversation = await Conversation.create({
      isGroup: false,
      memberIds: [senderId, participantId],
    });
    conversation = await conversation.populate(
      "memberIds",
      "fullName userName avatar status lastSeenAt"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, conversation, "Conversation ready"));
});

/* ═══════════════════════════════════════════════════════════════════════════
   GET /conversations/:conversationId/messages
   Paginated message history, newest page first.
   Query: ?page=1&limit=30
═══════════════════════════════════════════════════════════════════════════ */
export const getMessages = asyncHandler(async (req, res) => {
  const userId          = req.user._id;
  const { conversationId } = req.params;
  const page   = Math.max(parseInt(req.query.page)  || 1, 1);
  const limit  = Math.min(parseInt(req.query.limit) || 30, 100);
  const skip   = (page - 1) * limit;

  // Verify the requesting user is a member
  const conversation = await Conversation.findOne({
    _id: conversationId,
    memberIds: userId,
  });
  if (!conversation)
    throw new ApiError(403, "You are not a member of this conversation");

  const [messages, total] = await Promise.all([
    Message.find({ conversationId, deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "fullName userName avatar")
      .lean(),
    Message.countDocuments({ conversationId, deletedAt: null }),
  ]);

  // Mark incoming messages as read in the background
  markMessagesAsRead(conversationId, userId).catch(() => {});

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        messages: messages.reverse(), // return oldest → newest
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      },
      "Messages fetched"
    )
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   POST /conversations/:conversationId/messages
   Send a text message.
   Body: { content }

   After saving, emits via Socket.io so all room members get it in real-time.
   The socket instance is attached to req.app by the socket initializer.
═══════════════════════════════════════════════════════════════════════════ */
export const sendMessage = asyncHandler(async (req, res) => {
  const senderId        = req.user._id;
  const { conversationId } = req.params;
  const { content }     = req.body;

  if (!content?.trim()) throw new ApiError(400, "Message content is required");

  // Guard: sender must be a member
  const conversation = await Conversation.findOne({
    _id: conversationId,
    memberIds: senderId,
  });
  if (!conversation)
    throw new ApiError(403, "You are not a member of this conversation");

  // Save message
  const message = await Message.create({
    conversationId,
    senderId,
    type: "text",
    content: content.trim(),
  });

  const populated = await message.populate("senderId", "fullName userName avatar");

  // Update conversation's lastMessage snapshot + bump unread counts for others
  const otherMembers = conversation.memberIds.filter(
    (id) => id.toString() !== senderId.toString()
  );
  const unreadUpdate = {};
  otherMembers.forEach((id) => {
    unreadUpdate[`unreadCounts.${id}`] =
      (conversation.unreadCounts?.get?.(id.toString()) ?? 0) + 1;
  });

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      lastMessage: {
        text:     content.trim(),
        senderId,
        sentAt:   new Date(),
      },
      ...unreadUpdate,
    },
  });

  // Real-time: emit to conversation room via Socket.io
  const io = req.app.get("io");
  if (io) {
    io.to(conversationId.toString()).emit("chat:message", populated);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, populated, "Message sent"));
});

/* ═══════════════════════════════════════════════════════════════════════════
   POST /conversations/:conversationId/messages/image
   Upload an image via Cloudinary and send as a message.
   Requires multer middleware: upload.single("image")
═══════════════════════════════════════════════════════════════════════════ */
export const sendImageMessage = asyncHandler(async (req, res) => {
  const senderId        = req.user._id;
  const { conversationId } = req.params;

  if (!req.file?.path) throw new ApiError(400, "Image file is required");

  const conversation = await Conversation.findOne({
    _id: conversationId,
    memberIds: senderId,
  });
  if (!conversation)
    throw new ApiError(403, "You are not a member of this conversation");

  // Upload to Cloudinary
  const uploaded = await uploadOnCloudinary(req.file.path, "image");
  if (!uploaded?.secure_url)
    throw new ApiError(500, "Image upload failed");

  const message = await Message.create({
    conversationId,
    senderId,
    type:     "image",
    content:  "",
    imageUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
  });

  const populated = await message.populate("senderId", "fullName userName avatar");

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      lastMessage: {
        text:     "📷 Image",
        senderId,
        sentAt:   new Date(),
      },
    },
  });

  const io = req.app.get("io");
  if (io) {
    io.to(conversationId.toString()).emit("chat:message", populated);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, populated, "Image sent"));
});

/* ═══════════════════════════════════════════════════════════════════════════
   POST /conversations/:conversationId/messages/file
   ─────────────────────────────────────────────────────────────────────────
   P2P FILE TRANSFER FLOW
   ─────────────────────────────────────────────────────────────────────────
   WebRTC DataChannels handle the actual bytes peer-to-peer in the browser.
   This endpoint only persists the FILE METADATA as a message record so:
     1. Offline peers see what was sent when they come back online.
     2. The conversation's lastMessage preview is updated.
     3. The real-time socket event gives the recipient a "file incoming"
        notification with the transferId — the client uses this to accept
        the DataChannel stream that is simultaneously being opened.

   Body (JSON, NOT multipart):
   {
     "fileName":   "design.figma",
     "fileSize":   4823622,          // bytes
     "mimeType":   "application/figma",
     "transferId": "rtc-abc123"      // client-generated WebRTC session id
   }
═══════════════════════════════════════════════════════════════════════════ */
export const sendFileMetadata = asyncHandler(async (req, res) => {
  const senderId        = req.user._id;
  const { conversationId } = req.params;
  const { fileName, fileSize, mimeType, transferId } = req.body;

  // Validation
  if (!fileName)   throw new ApiError(400, "fileName is required");
  if (!fileSize)   throw new ApiError(400, "fileSize is required");
  if (!mimeType)   throw new ApiError(400, "mimeType is required");
  if (!transferId) throw new ApiError(400, "transferId is required — needed to link the WebRTC DataChannel");

  if (fileSize > 5 * 1024 * 1024 * 1024) // 5 GB hard cap on metadata registration
    throw new ApiError(400, "File exceeds maximum allowed size of 5 GB");

  const conversation = await Conversation.findOne({
    _id: conversationId,
    memberIds: senderId,
  });
  if (!conversation)
    throw new ApiError(403, "You are not a member of this conversation");

  // Save metadata-only message record
  const message = await Message.create({
    conversationId,
    senderId,
    type:    "file",
    content: "",
    fileMetadata: {
      fileName,
      fileSize,
      mimeType,
      transferId,
    },
  });

  const populated = await message.populate("senderId", "fullName userName avatar");

  // Format human-readable file size for lastMessage preview
  const sizeLabel = fileSize > 1024 * 1024
    ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
    : `${(fileSize / 1024).toFixed(0)} KB`;

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      lastMessage: {
        text:     `📁 ${fileName} (${sizeLabel})`,
        senderId,
        sentAt:   new Date(),
      },
    },
  });

  // Emit to conversation room — recipient's client listens for "chat:file_incoming"
  // and opens a WebRTC DataChannel using the transferId to receive the bytes
  const io = req.app.get("io");
  if (io) {
    io.to(conversationId.toString()).emit("chat:file_incoming", {
      message:    populated,
      transferId,
      fileName,
      fileSize,
      mimeType,
      senderId,
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, populated, "File transfer initiated"));
});

/* ═══════════════════════════════════════════════════════════════════════════
   PATCH /conversations/:conversationId/messages/read
   Mark all unread messages from others as read.
   Called when the user opens a conversation.
═══════════════════════════════════════════════════════════════════════════ */
export const markRead = asyncHandler(async (req, res) => {
  const userId          = req.user._id;
  const { conversationId } = req.params;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    memberIds: userId,
  });
  if (!conversation)
    throw new ApiError(403, "You are not a member of this conversation");

  await markMessagesAsRead(conversationId, userId);

  // Notify others in the room that messages were read
  const io = req.app.get("io");
  if (io) {
    io.to(conversationId.toString()).emit("chat:read", {
      conversationId,
      readBy: userId,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Messages marked as read"));
});

/* ═══════════════════════════════════════════════════════════════════════════
   DELETE /conversations/:conversationId/messages/:messageId
   Soft-delete a single message (only the sender can delete their own).
═══════════════════════════════════════════════════════════════════════════ */
export const deleteMessage = asyncHandler(async (req, res) => {
  const userId    = req.user._id;
  const { conversationId, messageId } = req.params;

  const message = await Message.findOne({
    _id: messageId,
    conversationId,
    deletedAt: null,
  });
  if (!message) throw new ApiError(404, "Message not found");
  if (message.senderId.toString() !== userId.toString())
    throw new ApiError(403, "You can only delete your own messages");

  // Soft delete — preserve the record for the other participant's history
  message.deletedAt = new Date();
  message.content   = "";
  await message.save();

  // If it was a Cloudinary image, clean up storage
  if (message.type === "image" && message.publicId) {
    deleteFromCloudinary(message.publicId).catch(() => {});
  }

  const io = req.app.get("io");
  if (io) {
    io.to(conversationId.toString()).emit("chat:message_deleted", {
      messageId,
      conversationId,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Message deleted"));
});

/* ═══════════════════════════════════════════════════════════════════════════
   GET /users/search
   Search users by userName or email (for starting new conversations).
   Query: ?q=searchTerm
═══════════════════════════════════════════════════════════════════════════ */
export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const requesterId = req.user._id;

  if (!q?.trim()) throw new ApiError(400, "Search query is required");
  if (q.trim().length < 2) throw new ApiError(400, "Query must be at least 2 characters");

  const regex = new RegExp(q.trim(), "i");

  const users = await User.find({
    _id:  { $ne: requesterId }, // exclude self
    $or:  [{ userName: regex }, { email: regex }, { fullName: regex }],
  })
    .select("fullName userName avatar email status lastSeenAt")
    .limit(20)
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users found"));
});