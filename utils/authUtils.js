// const { refreshAccessToken } = require("./refreshAccessToken"); // your existing file
// const { setTokensCookies } = require("./setTokensCookies"); // your existing file

// // Add refresh token endpoint
// exports.refreshTokenEndpoint = async (req, res) => {
//   try {
//     const result = await refreshAccessToken(req);
    
//     if (result.error) {
//       return res.status(401).json({
//         success: false,
//         message: result.message || "Token refresh failed"
//       });
//     }

//     // Set new cookies
//     setTokensCookies(
//       res,
//       result.newAccessToken,
//       result.newRefreshToken,
//       result.newAccessTokenExp,
//       result.newRefreshTokenExp
//     );

//     return res.json({
//       success: true,
//       message: "Token refreshed successfully"
//     });
//   } catch (error) {
//     console.error("Refresh token endpoint error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });
//   }
// };

// // Add middleware to automatically refresh tokens
// exports.autoRefreshMiddleware = async (req, res, next) => {
//   try {
//     const accessToken = req.cookies?.accessToken;
//     const refreshToken = req.cookies?.refreshToken;

//     if (!accessToken) {
//       return next();
//     }

//     const { isTokenExpire } = require("./isTokenExpire"); // your existing file
//     const isAccessTokenExpired = isTokenExpire(accessToken);
    
//     if (isAccessTokenExpired && refreshToken) {
//       console.log("Access token expired, attempting to refresh...");
      
//       const result = await refreshAccessToken(req);
      
//       if (!result.error) {
//         setTokensCookies(
//           res,
//           result.newAccessToken,
//           result.newRefreshToken,
//           result.newAccessTokenExp,
//           result.newRefreshTokenExp
//         );
        
//         console.log("Token refreshed successfully in middleware");
//       } else {
//         console.log("Token refresh failed in middleware:", result.message);
//         res.clearCookie('accessToken');
//         res.clearCookie('refreshToken');
//       }
//     }

//     next();
//   } catch (error) {
//     console.error("Auto refresh middleware error:", error);
//     next();
//   }
// };

// Helper function to extract Cloudinary public_id from URL
const extractPublicIdFromUrl = (url) => {
  try {
    // Parse the URL to get the path
    const urlParts = url.split('/');
    // Find the upload part and get everything after it
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
      // Get the version and public_id parts
      const versionAndPublicId = urlParts.slice(uploadIndex + 2).join('/');
      // Remove the file extension
      const publicId = versionAndPublicId.split('.')[0];
      return publicId;
    }
    return null;
  } catch (error) {
    // console.error("Error extracting public_id from URL:", error);
    return null;
  }
};

const fs = require('fs');
// Helper function to clean up temporary files
const cleanupTemporaryFiles = (files) => {
  if (!files || files.length === 0) return;
  
  for (const file of files) {
    try {
      const filePath = `uploads/${file.filename}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        // console.log(`Cleaned up temporary file: ${file.filename}`);
      }
    } catch (cleanupError) {
      // console.error(`Error cleaning up file ${file.filename}:`, cleanupError);
    }
  }
};

module.exports = {
  extractPublicIdFromUrl,
  cleanupTemporaryFiles,
};