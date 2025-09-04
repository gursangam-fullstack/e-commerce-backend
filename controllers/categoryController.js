const express = require("express");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
// Import Models
const Category = require("../model/category");
const sendResponse = require("../utils/sendResponse");
const slugify = require("slugify");
const {
  deleteOldImages,
  uploadImages,
  cleanupTemporaryFiles,
} = require("../utils/cloudinaryUtils");
const SubCategory = require("../model/subCategory");
const SubSubCategory = require("../model/subSubCategory");
const Product = require("../model/product");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CONFIG_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CONFIG_API_KEY,
  api_secret: process.env.CLOUDINARY_CONFIG_API_SECRET,
  secure: true,
});


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
        { name: { $regex: new RegExp(`^${name}$`, "i") } }, // Case-insensitive name match
        { slug: slug }, // Slug match
      ],
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

      return sendResponse(
        res,
        "Error uploading image to Cloudinary",
        500,
        false
      );
    }

    const category = new Category({
      name,
      slug,
      images: imagesArr, // Save array of Cloudinary URLs
    });

    await category.save();

    return sendResponse(res, "Category created successfully", 201, true, {
      data: category,
    });
  } catch (error) {
    // console.error("Error creating category:", error);

    // Clean up any temporary files in case of any error
    if (req.files && req.files.length > 0) {
      cleanupTemporaryFiles(req.files);
    }

    // Handle multer file size error
    if (error.code === "LIMIT_FILE_SIZE") {
      return sendResponse(
        res,
        "File size too large. Maximum size allowed is 5MB",
        400,
        false
      );
    }

    // Handle other multer errors
    if (error.message && error.message.includes("Only images are allowed")) {
      return sendResponse(
        res,
        "Only image files (JPEG, PNG, JPG) are allowed",
        400,
        false
      );
    }

    return sendResponse(res, "Error creating category", 500, false);
  }
};

// get all categories
exports.getAllCategories = async (req, res) => {
  try {
    // pagination code
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * (limit || 0);
    const total = await Category.countDocuments();

    const categories = limit
      ? await Category.find().skip(skip).limit(limit)
      : await Category.find();

    const updatedCategories = categories.map((cat) => {
      const imageUrl =
        cat.images && cat.images.length > 0 ? cat.images[0] : null;

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
      limit: limit || total,
    });
  } catch (error) {
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
      data: category,
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
    const files = req.files || [];

    // Fetch existing category
    const existingCategory = await Category.findById(req.params.id);
    if (!existingCategory) {
      cleanupTemporaryFiles(files);
      return sendResponse(res, "Category not found", 404, false);
    }

    // Build update data
    const updateData = { name, slug, description };

    // Handle image replacement
    if (files.length > 0) {
      await deleteOldImages(existingCategory.images);
      updateData.images = await uploadImages(files);
    }

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
      }
    );

    return sendResponse(res, "Category updated successfully", 200, true, {
      data: updated,
    });
  } catch (error) {
    console.error("Error updating category:", error);

    if (req.files?.length) cleanupTemporaryFiles(req.files);

    if (error.code === "LIMIT_FILE_SIZE") {
      return sendResponse(
        res,
        "File size too large. Maximum size allowed is 5MB",
        400,
        false
      );
    }

    if (error.message?.includes("Only images are allowed")) {
      return sendResponse(
        res,
        "Only image files (JPEG, PNG, JPG) are allowed",
        400,
        false
      );
    }

    return sendResponse(res, "Error updating category", 500, false);
  }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, "Invalid category ID", 400, false);
    }

    // Find category
    const category = await Category.findById(id);
    if (!category) {
      return sendResponse(res, "Category not found", 404, false);
    }

    // Delete old image if exists
    if (category.image) {
      await deleteOldImages([category.image]);
    }

    // Delete from DB
    await Category.findByIdAndDelete(id);

    return sendResponse(res, "Category deleted successfully", 200, true);
  } catch (error) {
    console.error("Error deleting category:", error);
    return sendResponse(res, "Error deleting category", 500, false);
  }
};

// delete all

// Delete all categories
exports.deleteAllCategories = async (req, res) => {
  try {
    // Get all categories to access their images
    const allCategories = await Category.find({});

    // Collect all images
    const imagesToDelete = allCategories
      .map((category) => category.image)
      .filter((img) => !!img);

    // Delete all images from Cloudinary
    if (imagesToDelete.length > 0) {
      await deleteOldImages(imagesToDelete);
    }

    // Delete all categories from database
    const result = await Category.deleteMany({});

    return sendResponse(res, "All categories deleted successfully", 200, true, {
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting all categories:", error);
    return sendResponse(res, "Error deleting all categories", 500, false);
  }
};

// Get category with all related data (subcategories, sub-subcategories, products)
exports.getCategoryWithAllRelatedData = async (req, res) => {
  try {
    const { categorySlug } = req.params;

    if (!categorySlug) {
      return sendResponse(res, "Category slug is required", 400, false);
    }

    // Get category
    const category = await Category.findOne({ slug: categorySlug })
      .select("_id name slug")
      .lean();

    if (!category) {
      return sendResponse(res, "Category not found", 404, false);
    }

    // Fetch subcategories, sub-subcategories, and products in parallel
    const [subCategories, subSubCategories, products] = await Promise.all([
      SubCategory.find({ parentCategory: category._id })
        .select("_id name slug")
        .lean(),
      SubSubCategory.find({ parentSubCategory: { $in: 
        await SubCategory.find({ parentCategory: category._id }).distinct("_id")
      }})
        .select("_id name slug parentSubCategory")
        .lean(),
      Product.find({ categories: category._id })
        .select("discountedPrice color variants.size")
        .lean(),
    ]);

    // Format products
    const formattedProducts = products.map((prod) => ({
      discountedPrice: prod.discountedPrice,
      color: prod.color,
      sizes: prod.variants?.map((variant) => variant.size) || [],
    }));

    // Final response
    const response = {
      category,
      subCategories,
      subSubCategories,
      products: formattedProducts,
      counts: {
        subCategories: subCategories.length,
        subSubCategories: subSubCategories.length,
        products: formattedProducts.length,
      },
    };

    return sendResponse(res, "Category data retrieved successfully", 200, true, {
      data: response,
    });
  } catch (error) {
    console.error("Error fetching category data:", error);
    return sendResponse(res, "Error fetching category data", 500, false);
  }
};

