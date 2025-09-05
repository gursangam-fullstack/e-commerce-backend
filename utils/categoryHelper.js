const fs = require("fs");

// Extract Cloudinary public_id from URL
const extractPublicIdFromUrl = (url) => {
  try {
    const urlParts = url.split("/");
    const uploadIndex = urlParts.findIndex((part) => part === "upload");
    if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
      const versionAndPublicId = urlParts.slice(uploadIndex + 2).join("/");
      return versionAndPublicId.split(".")[0];
    }
    return null;
  } catch {
    return null;
  }
};

// Clean up temporary files
const cleanupTemporaryFiles = (files) => {
  if (!files || files.length === 0) return;
  for (const file of files) {
    try {
      const filePath = `uploads/${file.filename}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore errors
    }
  }
};

module.exports = {
  extractPublicIdFromUrl,
  cleanupTemporaryFiles,
};
