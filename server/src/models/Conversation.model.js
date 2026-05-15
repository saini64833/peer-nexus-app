import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    memberIds:{},
    // The subset pattern: embedding the last message for performance
    lastMessage: {
      text: { type: String },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: { type: Date },
    },
  },
  { timestamps: true }
);

export const Conversation = mongoose.model("Conversation", conversationSchema);