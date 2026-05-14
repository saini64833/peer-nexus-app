import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { 
      type: String, 
      default: "https://your-default-image-url.com/avatar.png" 
    },
    status: { 
      type: String, 
      enum: ['online', 'offline', 'in-call'], 
      default: 'offline' 
    },
    lastSeenAt: { type: Date, default: Date.now },
    stripeCustomerId: { type: String },
    isPremium: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes make searching for specific users much faster
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ status: 1 });

userSchema.pre("save",async function (next) {
  if(!this.isModified("password")) return next();
  this.password=await bcrypt.hash(this.password,10);
  next();
})
userSchema.methods.isPasswordCorrect=async function (password) {
  return await bcrypt.compare(password,this.password);
}
export default mongoose.model("User", userSchema);