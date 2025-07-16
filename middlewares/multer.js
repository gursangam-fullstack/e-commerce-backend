// middleware/multerConfig.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

// Function to compress image using Sharp
const compressImage = async (buffer, filename) => {
  try {
    const compressedBuffer = await sharp(buffer)
      .resize(800, 800, { // Resize to max 800x800 while maintaining aspect ratio
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 80, // JPEG quality (0-100)
        progressive: true 
      })
      .png({ 
        quality: 80, // PNG quality (0-100)
        progressive: true 
      })
      .toBuffer();
    
    return compressedBuffer;
  } catch (error) {
    // console.error('Error compressing image:', error);
    throw error;
  }
};

// Configure memory storage for processing
const storage = multer.memoryStorage();

// File filter (optional)
const fileFilter = (req, file, cb) => {
  // console.log("File mimetype:", file.mimetype);
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"), false);
  }
};

// Initialize upload with file size limit of 5MB (increased since we'll compress)
const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB in bytes
  }
});

// Middleware to compress images after multer upload
const compressImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const uploadPath = path.join(__dirname, "../uploads");
    fs.mkdirSync(uploadPath, { recursive: true });

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      // Compress the image
      const compressedBuffer = await compressImage(file.buffer, file.originalname);
      
      // Generate unique filename
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const originalBaseName = path.parse(file.originalname).name;
      const extension = path.extname(file.originalname);
      const newFileName = `${uniqueSuffix}-${originalBaseName}${extension}`;
      
      // Save compressed image to disk
      const filePath = path.join(uploadPath, newFileName);
      fs.writeFileSync(filePath, compressedBuffer);
      
      // Update file object with new path and filename
      file.path = filePath;
      file.filename = newFileName;
    }
    
    next();
  } catch (error) {
    // console.error('Error in compressImages middleware:', error);
    return res.status(500).json({
      message: "Error processing images",
      error: true,
      success: false
    });
  }
};

// Export upload as default for backward compatibility
const multerExport = upload;

// Add compressImages as a property
multerExport.compressImages = compressImages;

module.exports = multerExport;

