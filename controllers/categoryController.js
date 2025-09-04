const express = require("express");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
// Import Models
const Category = require("../model/category");
const sendResponse = require("../utils/sendResponse");
const getPagination = require("../utils/pagination")
const slugify = require("slugify");

const { extractPublicIdFromUrl, cleanupTemporaryFiles } = require("../utils/categoryHelper");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CONFIG_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CONFIG_API_KEY,
  api_secret: process.env.CLOUDINARY_CONFIG_API_SECRET,
  secure: true,
});

// Helper function to extract Cloudinary public_id from URL
// const extractPublicIdFromUrl = (url) => {
//   try {
//     // Parse the URL to get the path
//     const urlParts = url.split('/');
//     // Find the upload part and get everything after it
//     const uploadIndex = urlParts.findIndex(part => part === 'upload');
//     if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
//       // Get the version and public_id parts
//       const versionAndPublicId = urlParts.slice(uploadIndex + 2).join('/');
//       // Remove the file extension
//       const publicId = versionAndPublicId.split('.')[0];
//       return publicId;
//     }
//     return null;
//   } catch (error) {
//     // console.error("Error extracting public_id from URL:", error);
//     return null;
//   }
// };

// // Helper function to clean up temporary files
// const cleanupTemporaryFiles = (files) => {
//   if (!files || files.length === 0) return;
  
//   for (const file of files) {
//     try {
//       const filePath = `uploads/${file.filename}`;
//       if (fs.existsSync(filePath)) {
//         fs.unlinkSync(filePath);
//         // console.log(`Cleaned up temporary file: ${file.filename}`);
//       }
//     } catch (cleanupError) {
//       // console.error(`Error cleaning up file ${file.filename}:`, cleanupError);
//     }
//   }
// };

exports.createCategoryController = async (req, res) => {
  try {
    const { name } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const categoryImages = req.files;

    // Validate category name
    if (!name) {
      return sendResponse(res, "Category name should not be empty", 400, false);
    }

    // Validate images
    if (!categoryImages || categoryImages.length === 0) {
      return sendResponse(res, "No image provided", 400, false);
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } }, // Case-insensitive name match
        { slug: slug } // Slug match
      ]
    });

    if (existingCategory) {
      return sendResponse(res, "Category already exists", 400, false);
    }

    // Upload images to Cloudinary
    const imagesArr = [];
    const uploadedFiles = []; // Track files that were successfully uploaded
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    };

    try {
      for (let i = 0; i < categoryImages.length; i++) {
        const result = await cloudinary.uploader.upload(
          categoryImages[i].path,
          options
        );
        imagesArr.push(result.secure_url);
        uploadedFiles.push(categoryImages[i]); // Track successfully uploaded files
        
        // Delete the temporary file after successful upload
        try {
          fs.unlinkSync(`uploads/${categoryImages[i].filename}`);
          // console.log(`Temporary file deleted: ${categoryImages[i].filename}`);
        } catch (deleteError) {
          // console.error(`Error deleting temporary file ${categoryImages[i].filename}:`, deleteError);
        }
      }
    } catch (uploadError) {
      // console.error("Error uploading image:", uploadError);
      
      // Clean up any temporary files that might still exist
      cleanupTemporaryFiles(categoryImages);
      
      return sendResponse(res, "Error uploading image to Cloudinary", 500, false);
    }

    const category = new Category({
      name,
      slug,
      images: imagesArr, // Save array of Cloudinary URLs
    });

    await category.save();

    return sendResponse(res, "Category created successfully", 201, true, {
      data: category
    });
  } catch (error) {
    // console.error("Error creating category:", error);
    
    // Clean up any temporary files in case of any error
    if (req.files && req.files.length > 0) {
      cleanupTemporaryFiles(req.files);
    }
    
    // Handle multer file size error
    if (error.code === 'LIMIT_FILE_SIZE') {
      return sendResponse(res, "File size too large. Maximum size allowed is 5MB", 400, false);
    }
    
    // Handle other multer errors
    if (error.message && error.message.includes('Only images are allowed')) {
      return sendResponse(res, "Only image files (JPEG, PNG, JPG) are allowed", 400, false);
    }
    
    return sendResponse(res, "Error creating category", 500, false);
  }
};

// get all categories
exports.getAllCategories = async (req, res) => {
  try {
    // pagination code
    // const page = parseInt(req.query.page) || 1;
    // const limit = parseInt(req.query.limit);
    // const skip = (page - 1) * (limit || 0);
    // const total = await Category.countDocuments();
 const { page, limit, skip } = getPagination(req.query);

    const total = await Category.countDocuments();
    const categories = limit
      ? await Category.find().skip(skip).limit(limit)
      : await Category.find();

    const updatedCategories = categories.map((cat) => {
      const imageUrl = cat.images && cat.images.length > 0 ? cat.images[0] : null;

      return {
        id: cat._id,
        name: cat.name,
        slug: cat.slug,
        imageUrl: imageUrl, // Now using Cloudinary URL directly
      };
    });

    return sendResponse(res, "Categories retrieved successfully", 200, true, {
      data: updatedCategories,
      total,
      page,
      limit: limit || total
    });
  } catch (error) {
    console.log(error)
    return sendResponse(res, "Error fetching categories", 500, false);
  }
};

// Get  single category
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Check for valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, "Invalid category ID", 400, false);
    }

    const category = await Category.findById(id).populate("name");

    if (!category) {
      return sendResponse(res, "Category not found", 404, false);
    }

    return sendResponse(res, "Category retrieved successfully", 200, true, {
      data: category
    });
  } catch (error) {
    // console.error("Error fetching category:", error);
    return sendResponse(res, "Error fetching category", 500, false);
  }
};

// Update Category
exports.updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const categoryImages = req.files;

    // Get the existing category to access current images
    const existingCategory = await Category.findById(req.params.id);
    if (!existingCategory) {
      return sendResponse(res, "Category not found", 404, false);
    }

    // Prepare update object
    const updateData = { name, slug, description };
    
    // Only update images if new images are uploaded
    if (categoryImages && categoryImages.length > 0) {
      // Delete old images from Cloudinary if they exist
      if (existingCategory.images && existingCategory.images.length > 0) {
        try {
          for (const imageUrl of existingCategory.images) {
            // Extract public_id from Cloudinary URL
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
          }
        } catch (deleteError) {
          // console.error("Error deleting old images from Cloudinary:", deleteError);
          // Continue with upload even if deletion fails
        }
      }

      // Upload new images to Cloudinary
      const imagesArr = [];
      const uploadedFiles = []; // Track files that were successfully uploaded
      const options = {
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      };

      try {
        for (let i = 0; i < categoryImages.length; i++) {
          const result = await cloudinary.uploader.upload(
            categoryImages[i].path,
            options
          );
          imagesArr.push(result.secure_url);
          uploadedFiles.push(categoryImages[i]); // Track successfully uploaded files
          
          // Delete the temporary file after successful upload
          try {
            fs.unlinkSync(`uploads/${categoryImages[i].filename}`);
            // console.log(`Temporary file deleted: ${categoryImages[i].filename}`);
          } catch (deleteError) {
            // console.error(`Error deleting temporary file ${categoryImages[i].filename}:`, deleteError);
          }
        }
        updateData.images = imagesArr;
      } catch (uploadError) {
        // console.error("Error uploading image:", uploadError);
        
        // Clean up any temporary files that might still exist
        cleanupTemporaryFiles(categoryImages);
        
        return sendResponse(res, "Error uploading image to Cloudinary", 500, false);
      }
    }

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    return sendResponse(res, "Category updated successfully", 200, true, {
      data: updated
    });
  } catch (error) {
    // console.error("Error updating category:", error);
    
    // Clean up any temporary files in case of any error
    if (req.files && req.files.length > 0) {
      cleanupTemporaryFiles(req.files);
    }
    
    // Handle multer file size error
    if (error.code === 'LIMIT_FILE_SIZE') {
      return sendResponse(res, "File size too large. Maximum size allowed is 5MB", 400, false);
    }
    
    // Handle other multer errors
    if (error.message && error.message.includes('Only images are allowed')) {
      return sendResponse(res, "Only image files (JPEG, PNG, JPG) are allowed", 400, false);
    }
    
    return sendResponse(res, "Error updating category", 500, false);
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, "Invalid category ID", 400, false);
    }

    // Get the category to access its images before deletion
    const category = await Category.findById(id);
    if (!category) {
      return sendResponse(res, "Category not found", 404, false);
    }

    // Delete images from Cloudinary if they exist
    if (category.images && category.images.length > 0) {
      try {
        for (const imageUrl of category.images) {
          // Extract public_id from Cloudinary URL
          const publicId = extractPublicIdFromUrl(imageUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
      } catch (deleteError) {
        // console.error("Error deleting images from Cloudinary:", deleteError);
        // Continue with category deletion even if image deletion fails
      }
    }

    // Delete the category from database
    const deleted = await Category.findByIdAndDelete(id);
    
    return sendResponse(res, "Category deleted successfully", 200, true);
  } catch (error) {
    // console.error("Error in deleteCategory:", error);
    return sendResponse(res, "Error deleting category", 500, false);
  }
};

// delete all

// Delete all categories
exports.deleteAllCategories = async (req, res) => {
  try {
    // Get all categories to access their images before deletion
    const allCategories = await Category.find({});
    
    // Delete all images from Cloudinary
    for (const category of allCategories) {
      if (category.images && category.images.length > 0) {
        try {
          for (const imageUrl of category.images) {
            // Extract public_id from Cloudinary URL
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
          }
        } catch (deleteError) {
          // console.error("Error deleting images from Cloudinary for category:", category._id, deleteError);
          // Continue with other deletions even if some fail
        }
      }
    }

    // Delete all categories from database
    const result = await Category.deleteMany({});
    
    return sendResponse(res, "All categories deleted successfully", 200, true, {
      deletedCount: result.deletedCount
    });
  } catch (error) {
    // console.error("Error deleting all categories:", error);
    return sendResponse(res, "Error deleting all categories", 500, false);
  }
};

exports.getCategoryWithAllRelatedData = async (req, res) => {
  try {
    const { categorySlug } = req.params;

    if (!categorySlug) {
      return sendResponse(res, "Category slug is required", 400, false);
    }

    const category = await Category.findOne({ slug: categorySlug });
    if (!category) {
      return sendResponse(res, "Category not found", 404, false);
    }

    const SubCategory = require('../model/subCategory');
    const subCategories = await SubCategory.find({ parentCategory: category._id });

    const SubSubCategory = require('../model/subSubCategory');
    const subCategoryIds = subCategories.map(sub => sub._id);
    const subSubCategories = await SubSubCategory.find({
      parentSubCategory: { $in: subCategoryIds }
    });

    const Product = require('../model/product');
    const products = await Product.find({ categories: category._id });

    // Format subcategories (without nesting subSubCategories)
    const formattedSubCategories = subCategories.map(sub => ({
      id: sub._id,
      name: sub.name,
      slug: sub.slug
    }));

    // Format sub-subcategories separately
    const formattedSubSubCategories = subSubCategories.map(subSub => ({
      id: subSub._id,
      name: subSub.name,
      slug: subSub.slug,
      parentSubCategory: subSub.parentSubCategory
    }));

    // Format products (only keep discountedPrice, color, and sizes from variants)
    const formattedProducts = products.map(prod => ({
      discountedPrice: prod.discountedPrice,
      color: prod.color,
      sizes: prod.variants?.map(variant => variant.size) || []
    }));

    // Final response object
    const response = {
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug
      },
      subCategories: formattedSubCategories,
      subSubCategories: formattedSubSubCategories,
      products: formattedProducts,
      counts: {
        subCategories: formattedSubCategories.length,
        subSubCategories: formattedSubSubCategories.length,
        products: formattedProducts.length
      }
    };

    return sendResponse(res, "Category data retrieved successfully", 200, true, {
      data: response
    });
  } catch (error) {
    // console.error("Error fetching category data:", error);
    return sendResponse(res, "Error fetching category data", 500, false);
  }
};

