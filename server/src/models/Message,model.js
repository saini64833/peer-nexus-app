import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Conversation", 
      required: true 
    },
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Creating compound indexes ensures that pulling chat history in order is lightning fast
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1 });

export default mongoose.model("Message", messageSchema);