import multer from "multer";
import fs from "fs";
import path from "path";

const tempDir = path.join(process.cwd(), "public", "temp");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${timestamp}_${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/png", "image/jpeg"];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PNG and JPEG images are allowed"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});