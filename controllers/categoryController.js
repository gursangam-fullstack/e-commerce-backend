const express = require("express");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
// Import Models
const Category = require("../model/category");
const sendResponse = require("../utils/sendResponse");
const getPagination = require("../utils/pagination");
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

// create category 
exports.createCategoryController = async (req, res) => {
  try {
    const { name } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const files = req.files || [];

    // Validate input
    if (!name) {
      cleanupTemporaryFiles(files);
      return sendResponse(res, "Category name is required", 400, false);
    }

    if (!files.length) {
      return sendResponse(res, "No image provided", 400, false);
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, "i") } }, // Case-insensitive
        { slug },
      ],
    });

    if (existingCategory) {
      cleanupTemporaryFiles(files);
      return sendResponse(res, "Category already exists", 400, false);
    }

    // Upload images (parallel + safe cleanup)
    const uploadedUrls = await uploadImages(files);

    if (!uploadedUrls.length) {
      return sendResponse(
        res,
        "Failed to upload images. Please try again.",
        500,
        false
      );
    }

    // Save category
    const category = new Category({
      name,
      slug,
      images: uploadedUrls,
    });

    await category.save();

    return sendResponse(res, "Category created successfully", 201, true, {
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error);

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

    return sendResponse(res, "Error creating category", 500, false);
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
      // delete old images (parallel + safe)
      await deleteOldImages(existingCategory.images);

      // upload new images (parallel + safe cleanup)
      updateData.images = await uploadImages(files);
    }

    // Update category in DB
    const updated = await Category.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

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

    // ✅ Validate ObjectId early
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, "Invalid category ID", 400, false);
    }

    // ✅ Fetch only once (lean for performance since no document methods needed)
    const category = await Category.findById(id).lean();
    if (!category) {
      return sendResponse(res, "Category not found", 404, false);
    }

    // ✅ Delete Cloudinary image if it exists
    if (category.image) {
      try {
        await deleteOldImages([category.image]);
      } catch (err) {
        console.error("Error deleting Cloudinary image:", err);
        // Don’t block DB delete if Cloudinary fails
      }
    }

    // ✅ Delete category from DB
    await Category.findByIdAndDelete(id);

    return sendResponse(res, "Category deleted successfully", 200, true);
  } catch (error) {
    console.error("Error deleting category:", error);
    return sendResponse(res, "Error deleting category", 500, false);
  }
};

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

// get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

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
        imageUrl: imageUrl, 
      };
    });

    return sendResponse(res, "Categories retrieved successfully", 200, true, {
      data: updatedCategories,
      total,
      page,
      limit: limit || total,
    });
  } catch (error) {
    console.log(error);
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
      SubSubCategory.find({
        parentSubCategory: {
          $in: await SubCategory.find({
            parentCategory: category._id,
          }).distinct("_id"),
        },
      })
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

    return sendResponse(
      res,
      "Category data retrieved successfully",
      200,
      true,
      {
        data: response,
      }
    );
  } catch (error) {
    console.error("Error fetching category data:", error);
    return sendResponse(res, "Error fetching category data", 500, false);
  }
};
