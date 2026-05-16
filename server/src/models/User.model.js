import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    userName: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: {
      type: String,
    },
    refreshToken: { type: String },
    status: {
      type: String,
      enum: ["online", "offline", "in-call"],
      default: "offline",
    },
    lastSeenAt: { type: Date, default: Date.now },
    stripeCustomerId: { type: String },
    isPremium: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes make searching for specific users much faster
userSchema.index({ status: 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFERESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFERESH_TOKEN_EXPIRY,
    }
  );
};
export const User = mongoose.model("User", userSchema);
