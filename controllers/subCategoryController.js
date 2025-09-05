const subCategory = require("../model/subCategory");
const SubCategory = require("../model/subCategory");
const slugify = require("slugify");
const sendResponse = require("../utils/sendResponse");

const getPagination = require("../utils/pagination")
const SubSubCategory  = require("../model/subSubCategory");
const Product  = require("../model/product");

const Category = require("../model/category");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const mongoose = require("mongoose");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CONFIG_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CONFIG_API_KEY,
  api_secret: process.env.CLOUDINARY_CONFIG_API_SECRET,
  secure: true,
});

// Helper function to extract Cloudinary public_id from URL
const extractPublicIdFromUrl = (url) => {
  try {
    // Parse the URL to get the path
    const urlParts = url.split("/");
    // Find the upload part and get everything after it
    const uploadIndex = urlParts.findIndex((part) => part === "upload");
    if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
      // Get the version and public_id parts
      const versionAndPublicId = urlParts.slice(uploadIndex + 2).join("/");
      // Remove the file extension
      const publicId = versionAndPublicId.split(".")[0];
      return publicId;
    }
    return null;
  } catch (error) {
    // console.error("Error extracting public_id from URL:", error);
    return null;
  }
};

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

exports.createSubCategory = async (req, res) => {
  try {
    const { name, parentCategoryId } = req.body;
    const subCategoryImages = req.files;

    // Validate subcategory name
    if (!name) {
      return sendResponse(
        res,
        "Subcategory name should not be empty",
        400,
        false
      );
    }

    // Validate parent category
    if (!parentCategoryId) {
      return sendResponse(res, "Parent category ID is required", 400, false);
    }

    // Validate images
    if (!subCategoryImages || subCategoryImages.length === 0) {
      return sendResponse(res, "At least one image is required", 400, false);
    }

    const slug = slugify(name, { lower: true, strict: true });

    // 🔍 Check if subcategory with same slug exists under the same parent
    const slugExists = await SubCategory.findOne({
      parentCategory: parentCategoryId,
      slug: slug,
    });

    if (slugExists) {
      return sendResponse(
        res,
        "Subcategory already exists under this parent category",
        400,
        false
      );
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
      for (let i = 0; i < subCategoryImages.length; i++) {
        const result = await cloudinary.uploader.upload(
          subCategoryImages[i].path,
          options
        );
        imagesArr.push(result.secure_url);
        uploadedFiles.push(subCategoryImages[i]); // Track successfully uploaded files

        // Delete the temporary file after successful upload
        try {
          fs.unlinkSync(`uploads/${subCategoryImages[i].filename}`);
          // console.log(`Temporary file deleted: ${subCategoryImages[i].filename}`);
        } catch (deleteError) {
          // console.error(`Error deleting temporary file ${subCategoryImages[i].filename}:`, deleteError);
        }
      }
    } catch (uploadError) {
      // console.error("Error uploading image:", uploadError);

      // Clean up any temporary files that might still exist
      cleanupTemporaryFiles(subCategoryImages);

      return sendResponse(
        res,
        "Error uploading image to Cloudinary",
        500,
        false
      );
    }

    // ✅ Create new subcategory
    const subCategory = new SubCategory({
      name,
      slug,
      images: imagesArr, // Save array of Cloudinary URLs
      parentCategory: parentCategoryId,
    });

    await subCategory.save();

    return sendResponse(res, "SubCategory created successfully", 201, true, {
      data: subCategory,
    });
  } catch (error) {
    // console.error("Error creating subcategory:", error);

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

    return sendResponse(res, "Error creating subcategory", 500, false);
  }
};

// get all products
exports.getAllSubCategories = async (req, res) => {
  try {

    //pagination code
    // const page = parseInt(req.query.page) || 0;
    // const limit = parseInt(req.query.limit) || 0;
    // const skip = (page - 1) * limit;
    // const total = await SubCategory.countDocuments();
    const { page, limit, skip } = getPagination(req.query);
    
        const total = await Category.countDocuments();
        const subcategories = limit
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

// Update Category
exports.updateSubCategory = async (req, res) => {
  try {
    const { name, parent } = req.body;
    const subCategoryImages = req.files;

    // Get the existing subcategory to access current images
    const existingSubCategory = await SubCategory.findById(req.params.id);
    if (!existingSubCategory) {
      return sendResponse(res, "SubCategory not found", 404, false);
    }

    // Prepare update object (only name, images, parentCategory)
    const updateData = {
      name,
    };

    // Only update parentCategory if parent is explicitly provided
    if (parent !== undefined) {
      updateData.parentCategory = parent || null;
    }

    // Generate new slug if name is being updated
    if (name) {
      const newSlug = slugify(name, { lower: true, strict: true });
      updateData.slug = newSlug;
    }

    // Only update images if new images are uploaded
    if (subCategoryImages && subCategoryImages.length > 0) {
      // Delete old images from Cloudinary if they exist
      if (existingSubCategory.images && existingSubCategory.images.length > 0) {
        try {
          for (const imageUrl of existingSubCategory.images) {
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
        for (let i = 0; i < subCategoryImages.length; i++) {
          const result = await cloudinary.uploader.upload(
            subCategoryImages[i].path,
            options
          );
          imagesArr.push(result.secure_url);
          uploadedFiles.push(subCategoryImages[i]); // Track successfully uploaded files

          // Delete the temporary file after successful upload
          try {
            fs.unlinkSync(`uploads/${subCategoryImages[i].filename}`);
            // console.log(`Temporary file deleted: ${subCategoryImages[i].filename}`);
          } catch (deleteError) {
            // console.error(`Error deleting temporary file ${subCategoryImages[i].filename}:`, deleteError);
          }
        }
        updateData.images = imagesArr;
      } catch (uploadError) {
        // console.error("Error uploading image:", uploadError);

        // Clean up any temporary files that might still exist
        cleanupTemporaryFiles(subCategoryImages);

        return sendResponse(
          res,
          "Error uploading image to Cloudinary",
          500,
          false
        );
      }
    }

    const updated = await SubCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("parentCategory", "name slug images");

    // Subcategory image(s) - now using Cloudinary URLs directly
    let subCategoryImageUrls = updated.images || [];

    // Parent category image - now using Cloudinary URLs directly
    const parentCat = updated.parentCategory;
    let parentImageUrl = null;
    if (parentCat && parentCat.images && parentCat.images.length > 0) {
      parentImageUrl = parentCat.images[0];
    }

    const responseData = {
      id: updated._id,
      name: updated.name,
      slug: updated.slug,
      images: subCategoryImageUrls,
      parentCategory: parentCat
        ? {
            id: parentCat._id,
            name: parentCat.name,
            slug: parentCat.slug,
            imageUrl: parentImageUrl,
          }
        : null,
    };

    return sendResponse(res, "SubCategory updated successfully", 200, true, {
      data: responseData,
    });
  } catch (error) {
    // console.error("Error updating subcategory:", error);

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

    return sendResponse(res, "Error updating subcategory", 500, false);
  }
};

// delete sub category
exports.deletesubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, "Invalid subcategory ID", 400, false);
    }

    // Get the subcategory to access its images before deletion
    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return sendResponse(res, "SubCategory not found", 404, false);
    }

    // Delete images from Cloudinary if they exist
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
        // console.error("Error deleting images from Cloudinary:", deleteError);
        // Continue with subcategory deletion even if image deletion fails
      }
    }

    // Delete the subcategory from database
    const deletedSubCategory = await SubCategory.findByIdAndDelete(id);

    return sendResponse(res, "SubCategory deleted successfully", 200, true);
  } catch (error) {
    // console.error("Delete subcategory error:", error);
    return sendResponse(res, "Error deleting subcategory", 500, false);
  }
};

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
