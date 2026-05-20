import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
// Cookie options
const options = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
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
    console.error("Token generation error:", error.message);
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
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});
const loginUser = asyncHandler(async (req, res) => {
  const { userName, email, password } = req.body;
  if (!(userName || email)) {
    throw new ApiError(400, "email and username required");
  }
  const user = await User.findOne({
    $or: [{ email }, { userName }],
  });
  if (!user) {
    throw new ApiError(400, "User resistration required");
  }

  const isPasswordVailid = await user.isPasswordCorrect(password);

  if (!isPasswordVailid) {
    throw new ApiError(401, "password is invailid!!");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const logedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: logedInUser,
          refreshToken,
          accessToken,
        },
        "User logged in successfully!!"
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fatched successfully"));
});
const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User successfully loged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "refreshToken expired!!");
  }

  try {
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedRefreshToken._id);
    if (!user) {
      throw new ApiError(401, "invalid refreshToken!!");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token expired or used");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    return res
      .status(200)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          200,
          {
            refreshToken: refreshToken,
            accessToken,
          },
          "successfully refreshToken is refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "refreshToken is invailid");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(400, "user does not exist");
  }
  const oldPasswordIsVailid = await user.isPasswordCorrect(oldPassword);
  if (!oldPasswordIsVailid) {
    throw new ApiError(401, "old password is invailid");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password is successfully changed"));
});
export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword
};
