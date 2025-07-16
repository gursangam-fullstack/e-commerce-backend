const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multer");
const auth = require("../middlewares/auth");

router.post("/upload", auth, upload.any(), upload.compressImages, (req, res) => {
  console.log("Uploaded files:", req.files);

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  // Collect all file paths
  const imageUrls = req.files.map(file => file.path);

  res.json({
    message: "Image(s) uploaded successfully",
    imageUrls
  });
});

module.exports = router;

