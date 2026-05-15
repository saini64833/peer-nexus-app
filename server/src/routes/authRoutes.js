import { registerUser } from "../controllers/authController.js";
import express from "express";
import { upload } from "../middleware/multer.js";
const router = express.Router();

router.post("/register", upload.single("avatar"), registerUser);

export default router;