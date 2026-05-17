import mongoose from "mongoose";

/**
 * Message types:
 *  "text"       — plain text message
 *  "file"       — P2P file transferred via WebRTC DataChannel; metadata stored here
 *  "image"      — image uploaded to Cloudinary
 *  "system"     — system-generated info message (e.g. "User joined")
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Type of message
    type: {
      type: String,
      enum: ["text", "file", "image", "system"],
      default: "text",
    },

    // For type === "text" | "system"
    content: {
      type: String,
      default: "",
    },

    // For type === "file" — P2P file metadata (actual bytes sent via WebRTC DataChannel)
    fileMetadata: {
      fileName:  { type: String },
      fileSize:  { type: Number },   // bytes
      mimeType:  { type: String },
      // Optional: Cloudinary URL if file was also cloud-backed
      url:       { type: String },
      publicId:  { type: String },
      // WebRTC transfer session id — client uses this to match the DataChannel stream
      transferId: { type: String },
    },

    // For type === "image" — Cloudinary-hosted image
    imageUrl:  { type: String },
    publicId:  { type: String },

    // Read status
    isRead: { type: Boolean, default: false },

    // Soft delete
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index: paginate messages in a conversation by time — O(log n)
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

export const Message = mongoose.model("Message", messageSchema);