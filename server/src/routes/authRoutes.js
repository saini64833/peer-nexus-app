import {
  registerUser,
  logOutUser,
  loginUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword
} from "../controllers/authController.js";
import express from "express";
import { upload } from "../middleware/multer.js";
import { verifyJwt } from "../middleware/requireAuth.js";
const router = express.Router();

router.post("/register", upload.single("avatar"), registerUser);
router.get("/refresh", refreshAccessToken);
router.post("/login",  loginUser);
router.post("/logout", verifyJwt, logOutUser);
router.get("/me",verifyJwt,getCurrentUser);
router.patch("/change-password",verifyJwt,changeCurrentPassword);
export default router;
