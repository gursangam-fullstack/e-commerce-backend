const fs = require("fs");
const cloudinary = require("cloudinary").v2;

// Extract Cloudinary publicId from image URL
const extractPublicIdFromUrl = (url) => {
  try {
    const parts = url.split("/");
    const filename = parts.pop().split(".")[0];
    return parts.slice(parts.indexOf("upload") + 1).join("/") + "/" + filename;
  } catch {
    return null;
  }
};

// Delete images from Cloudinary
const deleteOldImages = async (images = []) => {
  for (const url of images) {
    const publicId = extractPublicIdFromUrl(url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(`Error deleting Cloudinary image ${publicId}:`, err);
      }
    }
  }
};

// Upload images to Cloudinary
const uploadImages = async (files) => {
  const uploadedUrls = [];
  for (const file of files) {
    const result = await cloudinary.uploader.upload(file.path, {
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    });
    uploadedUrls.push(result.secure_url);
    cleanupTemporaryFiles([file]); // remove local file
  }
  return uploadedUrls;
};

// Delete local temp files
const cleanupTemporaryFiles = (files) => {
  files.forEach((file) => {
    try {
      fs.unlinkSync(`uploads/${file.filename}`);
    } catch {}
  });
};

module.exports = { deleteOldImages, uploadImages, cleanupTemporaryFiles };
