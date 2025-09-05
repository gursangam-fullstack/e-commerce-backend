const SubCategory = require("../model/subCategory");
const slugify = require("slugify");
const sendResponse = require("../utils/sendResponse");

const getPagination = require("../utils/pagination");
const SubSubCategory = require("../model/subSubCategory");
const Product = require("../model/product");
const {
  deleteOldImages,
  uploadImages,
  cleanupTemporaryFiles,
} = require("../utils/cloudinaryUtils");

const Category = require("../model/category");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CONFIG_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CONFIG_API_KEY,
  api_secret: process.env.CLOUDINARY_CONFIG_API_SECRET,
  secure: true,
});

// create sub category
exports.createSubCategory = async (req, res) => {
  try {
    const { name, parentCategoryId } = req.body;
    const files = req.files || [];

    // Validate inputs
    if (!name) {
      cleanupTemporaryFiles(files);
      return sendResponse(res, "Subcategory name is required", 400, false);
    }

    if (!parentCategoryId) {
      cleanupTemporaryFiles(files);
      return sendResponse(res, "Parent category ID is required", 400, false);
    }

    if (!files.length) {
      return sendResponse(res, "At least one image is required", 400, false);
    }

    const slug = slugify(name, { lower: true, strict: true });

    // 🔍 Check if subcategory with same slug exists under the same parent
    const slugExists = await SubCategory.findOne({
      parentCategory: parentCategoryId,
      slug,
    });

    if (slugExists) {
      cleanupTemporaryFiles(files);
      return sendResponse(
        res,
        "Subcategory already exists under this parent category",
        400,
        false
      );
    }

    // Upload images (parallel + cleanup)
    const uploadedUrls = await uploadImages(files);

    if (!uploadedUrls.length) {
      return sendResponse(
        res,
        "Failed to upload images. Please try again.",
        500,
        false
      );
    }

    // ✅ Create new subcategory
    const subCategory = new SubCategory({
      name,
      slug,
      images: uploadedUrls,
      parentCategory: parentCategoryId,
    });

    await subCategory.save();

    return sendResponse(res, "SubCategory created successfully", 201, true, {
      data: subCategory,
    });
  } catch (error) {
    console.error("Error creating subcategory:", error);

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

    return sendResponse(res, "Error creating subcategory", 500, false);
  }
};

// Update sub Category
exports.updateSubCategory = async (req, res) => {
  try {
    const { name, parentCategoryId, description } = req.body;
    const files = req.files || [];

    // Fetch existing subcategory
    const existingSubCategory = await SubCategory.findById(req.params.id);
    if (!existingSubCategory) {
      cleanupTemporaryFiles(files);
      return sendResponse(res, "Subcategory not found", 404, false);
    }

    // Build update data
    const updateData = {};
    if (name) {
      updateData.name = name;
      updateData.slug = slugify(name, { lower: true, strict: true });
    }
    if (description) updateData.description = description;
    if (parentCategoryId) updateData.parentCategory = parentCategoryId;

    // Handle image replacement
    if (files.length > 0) {
      // delete old images
      await deleteOldImages(existingSubCategory.images);

      // upload new images
      updateData.images = await uploadImages(files);
    }

    // Update subcategory in DB
    const updated = await SubCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    return sendResponse(res, "SubCategory updated successfully", 200, true, {
      data: updated,
    });
  } catch (error) {
    console.error("Error updating subcategory:", error);

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

    return sendResponse(res, "Error updating subcategory", 500, false);
  }
};

// delete sub category
exports.deletesubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, "Invalid subcategory ID", 400, false);
    }

    // ✅ Fetch subcategory (lean for performance since no doc methods needed)
    const subCategory = await SubCategory.findById(id).lean();
    if (!subCategory) {
      return sendResponse(res, "SubCategory not found", 404, false);
    }

    // ✅ Delete Cloudinary images (parallel for performance)
    if (subCategory.images?.length) {
      try {
        const deletePromises = subCategory.images.map((url) => {
          const publicId = extractPublicIdFromUrl(url);
          return publicId ? cloudinary.uploader.destroy(publicId) : null;
        });
        await Promise.all(deletePromises);
      } catch (err) {
        console.error(
          "Error deleting subcategory images from Cloudinary:",
          err
        );
        // continue DB delete even if Cloudinary fails
      }
    }

    // ✅ Delete subcategory from DB
    await SubCategory.findByIdAndDelete(id);

    return sendResponse(res, "SubCategory deleted successfully", 200, true);
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    return sendResponse(res, "Error deleting subcategory", 500, false);
  }
};

// delete all sub category
exports.deleteAllSubCategory = async (req, res) => {
  try {
    // Get all subcategories to access their images before deletion
    const allSubCategories = await SubCategory.find({});

    // Delete all images from Cloudinary
    for (const subCategory of allSubCategories) {
      if (subCategory.images && subCategory.images.length > 0) {
        try {
          for (const imageUrl of subCategory.images) {
            // Extract public_id from Cloudinary URL
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
          }
        } catch (deleteError) {
          // console.error("Error deleting images from Cloudinary for subcategory:", subCategory._id, deleteError);
          // Continue with other deletions even if some fail
        }
      }
    }

    // Delete all subcategories from database
    const result = await SubCategory.deleteMany({});

    return sendResponse(
      res,
      "All sub categories deleted successfully",
      200,
      true,
      {
        deletedCount: result.deletedCount,
      }
    );
  } catch (error) {
    // console.error("Delete all sub categories:", error);
    return sendResponse(res, "Error deleting all sub categories", 500, false);
  }
};

// get all sub category
exports.getAllSubCategories = async (req, res) => {
  try {
    //pagination code
    // const page = parseInt(req.query.page) || 0;
    // const limit = parseInt(req.query.limit) || 0;
    // const skip = (page - 1) * limit;
    // const total = await SubCategory.countDocuments();
    const { page, limit, skip } = getPagination(req.query);

    const total = await Category.countDocuments();
    const subcategories = limit;
    //end

    const subCategories = await SubCategory.find()
      .skip(skip)
      .limit(limit)
      .populate("parentCategory", "name slug images");

    const updatedSubCategories = subCategories.map((sub) => {
      const parent = sub.parentCategory;

      // Subcategory images
      const subCategoryImageUrls = sub.images || [];

      // Parent category first image
      const parentImageUrl =
        parent && parent.images && parent.images.length > 0
          ? parent.images[0]
          : null;

      return {
        id: sub._id,
        name: sub.name,
        slug: sub.slug,
        images: subCategoryImageUrls,
        category: parent
          ? {
              id: parent._id,
              name: parent.name,
              slug: parent.slug,
              imageUrl: parentImageUrl,
            }
          : null,
      };
    });

    // calculate hasMore
    const hasMore = limit > 0 ? page * limit < total : false;

    return sendResponse(
      res,
      "SubCategories retrieved successfully",
      200,
      true,
      {
        data: updatedSubCategories,
        total,
        page,
        limit,
        hasMore,
      }
    );
  } catch (error) {
    return sendResponse(res, "Error fetching subcategories", 500, false);
  }
};
// get sub category by id
exports.getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await SubCategory.findById(id).populate(
      "parentCategory",
      "name"
    );

    if (!subCategory) {
      return sendResponse(res, "SubCategory not found", 404, false);
    }

    return sendResponse(res, "SubCategory retrieved successfully", 200, true, {
      data: subCategory,
    });
  } catch (error) {
    // console.error("Error fetching sub-category by ID:", error);
    return sendResponse(res, "Error fetching sub-category", 500, false);
  }
};

// get sub category by category
exports.getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return sendResponse(res, "Category ID is required", 400, false);
    }

    const subCategories = await SubCategory.find({
      parentCategory: categoryId,
    }).populate("parentCategory", "name slug images");

    const updatedSubCategories = subCategories.map((sub) => {
      const parent = sub.parentCategory;

      // Subcategory image(s) - now using Cloudinary URLs directly
      let subCategoryImageUrls = sub.images || [];

      // Parent category image - now using Cloudinary URLs directly
      let parentImageUrl = null;
      if (parent && parent.images && parent.images.length > 0) {
        parentImageUrl = parent.images[0];
      }

      return {
        id: sub._id,
        name: sub.name,
        slug: sub.slug,
        images: subCategoryImageUrls,
        category: parent
          ? {
              id: parent._id,
              name: parent.name,
              slug: parent.slug,
              imageUrl: parentImageUrl,
            }
          : null,
      };
    });

    return sendResponse(
      res,
      "SubCategories retrieved successfully",
      200,
      true,
      {
        data: updatedSubCategories,
        total: updatedSubCategories.length,
      }
    );
  } catch (error) {
    // console.error("Error fetching subcategories by category:", error);
    return sendResponse(res, "Error fetching subcategories", 500, false);
  }
};

// get sub category with related data
exports.getSubCategoryWithRelatedData = async (req, res) => {
  try {
    const { categorySlug, subCategorySlug } = req.params;

    if (!categorySlug || !subCategorySlug) {
      return sendResponse(
        res,
        "Category slug and SubCategory slug are required",
        400,
        false
      );
    }

    // Find category by slug
    const category = await Category.findOne({ slug: categorySlug });
    if (!category) {
      return sendResponse(res, "Category not found", 404, false);
    }

    // Fetch subcategory (to confirm it belongs to the given category)
    const subCat = await SubCategory.findOne({
      slug: subCategorySlug,
      parentCategory: category._id,
    }).lean();

    if (!subCat) {
      return sendResponse(
        res,
        "SubCategory not found for given category",
        404,
        false
      );
    }

    // Fetch sub-subcategories under this subcategory
    const subSubCategories = await SubSubCategory.find({
      parentSubCategory: subCat._id,
    }).lean();

    // Fetch products that belong to both category AND subcategory
    const products = await Product.find({
      categories: category._id,
      subCategories: subCat._id,
    })
      .select("discountedPrice color variants")
      .lean();

    // Format sub-subcategories
    const formattedSubSubCategories = subSubCategories.map((subSub) => ({
      id: subSub._id,
      name: subSub.name,
      slug: subSub.slug,
    }));

    // Format products
    const formattedProducts = products.map((prod) => ({
      discountedPrice: prod.discountedPrice,
      color: prod.color,
      sizes: prod.variants?.map((variant) => variant.size) || [],
    }));

    const response = {
      subCategory: {
        id: subCat._id,
        name: subCat.name,
        slug: subCat.slug,
      },
      subSubCategories: formattedSubSubCategories,
      products: formattedProducts,
      counts: {
        subSubCategories: formattedSubSubCategories.length,
        products: formattedProducts.length,
      },
    };

    return sendResponse(
      res,
      "SubCategory data retrieved successfully",
      200,
      true,
      {
        data: response,
      }
    );
  } catch (error) {
    // console.error("Error fetching subCategory data:", error);
    return sendResponse(res, "Error fetching subCategory data", 500, false);
  }
};
