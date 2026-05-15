import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

// Cookie options
const options = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
};

// Generate access + refresh token
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();

    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

// Register User
const registerUser = asyncHandler(async (req, res) => {
  const { password, fullName, userName, email } = req.body;

  // Validation
  if (
    [fullName, userName, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Check existing user
  const existedUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { userName: userName.toLowerCase() }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // Get avatar path
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Upload avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar || !avatar.secure_url) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  // Create user
  const user = await User.create({
    fullName,
    userName: userName.toLowerCase(),
    email: email.toLowerCase(),
    password,
    avatar: avatar.secure_url,
  });
  // Remove sensitive fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    // Delete uploaded image if user creation fails
    if (avatar.public_id) {
      await deleteFromCloudinary(avatar.public_id);
    }

    throw new ApiError(500, "Something went wrong while registering user");
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // Response
  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        createdUser,
        "User registered successfully"
      )
    );
});

export { registerUser };
