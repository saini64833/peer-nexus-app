import { registerUser,logOutUser,loginUser,refreshAccessToken } from "../controllers/authController.js";
import express from "express";
import { upload } from "../middleware/multer.js";
import { verifyJwt } from "../middleware/requireAuth.js";
const router = express.Router();

router.post("/register", upload.single("avatar"), registerUser);
router.get("/refresh", refreshAccessToken);
router.post("/login", verifyJwt, loginUser);
router.post("/logout", verifyJwt, logOutUser);
export default router;