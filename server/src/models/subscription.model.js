import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    stripeSubscriptionId: { type: String, required: true },
    planType: { 
      type: String, 
      enum: ['free', 'premium'], 
      default: 'free' 
    },
    status: { 
      type: String, 
      enum: ['active', 'past_due', 'canceled', 'incomplete'], 
      required: true 
    },
    currentPeriodEnd: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);