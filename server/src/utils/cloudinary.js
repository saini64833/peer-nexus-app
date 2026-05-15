import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Generic uploader that handles images etc.
const uploadOnCloudinary = async (localFilePath, resourceType = "auto") => {
  try {
    if (!localFilePath) {
      console.warn("No file path provided for Cloudinary upload");
      return null;
    }
    console.log(`Uploading to Cloudinary (${resourceType}):`, localFilePath);
    const options = { resource_type: resourceType };
    const res = await cloudinary.uploader.upload(localFilePath, options);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return res;
  } catch (error) {
    console.error("Cloudinary upload failed for", localFilePath, "Error:", error);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
};
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };