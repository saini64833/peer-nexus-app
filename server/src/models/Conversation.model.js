import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },

    // Array of participant user IDs
    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Subset pattern: embed last message for O(1) conversation list rendering
    lastMessage: {
      text:     { type: String },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt:   { type: Date },
    },

    // Unread count per member — keyed by userId string
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Fast lookup: "all conversations this user is in"
conversationSchema.index({ memberIds: 1 });
// Fast lookup: "find DM between two users"
conversationSchema.index({ memberIds: 1, isGroup: 1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);