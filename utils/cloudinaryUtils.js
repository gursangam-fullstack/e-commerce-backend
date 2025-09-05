const fs = require("fs");
const cloudinary = require("cloudinary").v2;

// Extract Cloudinary publicId from image URL
const extractPublicIdFromUrl = (url) => {
  try {
    // Remove query params if present
    const cleanUrl = url.split("?")[0];

    // Get everything after /upload/
    const parts = cleanUrl.split("/upload/");
    if (parts.length < 2) return null;

    // Remove file extension (e.g., .jpg, .png)
    const withoutExt = parts[1].replace(/\.[^/.]+$/, "");

    return withoutExt; // includes folders if present
  } catch (error) {
    console.error("Error extracting Cloudinary public_id:", error);
    return null;
  }
};

// Delete images from Cloudinary
const deleteOldImages = async (images = []) => {
  if (!images.length) return;

  const deletePromises = images.map(async (url) => {
    const publicId = extractPublicIdFromUrl(url);
    if (!publicId) return;

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error(`Error deleting Cloudinary image ${publicId}:`, err);
    }
  });

  await Promise.allSettled(deletePromises);
};

// Upload images to Cloudinary
const uploadImages = async (files = []) => {
  if (!files.length) return [];

  const uploadPromises = files.map(async (file) => {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      });
      return result.secure_url;
    } finally {
      cleanupTemporaryFiles([file]); // always cleanup even on failure
    }
  });

  const results = await Promise.allSettled(uploadPromises);

  // Extract successful uploads only
  return results
    .filter((res) => res.status === "fulfilled")
    .map((res) => res.value);
};

// Promise-based cleanup
const cleanupTemporaryFiles = async (files) => {
  if (!files || !Array.isArray(files)) return;

  await Promise.allSettled(
    files.map((file) => {
      const filePath = file.path || path.join("uploads", file.filename);
      return fs.unlink(filePath).catch((err) => {
        console.error(`❌ Failed to delete temp file: ${filePath}`, err);
      });
    })
  );
};


module.exports = { deleteOldImages, uploadImages, cleanupTemporaryFiles };
