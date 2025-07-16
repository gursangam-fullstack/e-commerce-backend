const SubSubCategory = require("../model/subSubCategory");
const slugify = require("slugify");
const sendResponse = require("../utils/sendResponse");
const SubCategory = require("../model/subCategory");
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

exports.createSubSubCategory = async (req, res) => {
  try {
    const { name, parentSubCategoryId } = req.body;
    const subSubCategoryImages = req.files;

    // Validate name
    if (!name) {
      return sendResponse(res, "Sub-subcategory name should not be empty", 400, false);
    }

    // Validate parent subcategory
    if (!parentSubCategoryId) {
      return sendResponse(res, "Parent subcategory ID is required", 400, false);
    }

    // Validate images
    if (!subSubCategoryImages || subSubCategoryImages.length === 0) {
      return sendResponse(res, "At least one image is required", 400, false);
    }

    const slug = slugify(name, { lower: true, strict: true });

    // Check if sub-subcategory with same slug exists under the same parent
    const slugExists = await SubSubCategory.findOne({
      parentSubCategory: parentSubCategoryId,
      slug: slug,
    });

    if (slugExists) {
      return sendResponse(res, "Sub-subcategory already exists under this parent subcategory", 400, false);
    }

    // Upload images to Cloudinary
    const imagesArr = [];
    const uploadedFiles = [];
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    };

    try {
      for (let i = 0; i < subSubCategoryImages.length; i++) {
        const result = await cloudinary.uploader.upload(
          subSubCategoryImages[i].path,
          options
        );
        imagesArr.push(result.secure_url);
        uploadedFiles.push(subSubCategoryImages[i]);
        // Delete the temporary file after successful upload
        try {
          fs.unlinkSync(`uploads/${subSubCategoryImages[i].filename}`);
          // console.log(`Temporary file deleted: ${subSubCategoryImages[i].filename}`);
        } catch (deleteError) {
          // console.error(`Error deleting temporary file ${subSubCategoryImages[i].filename}:`, deleteError);
        }
      }
    } catch (uploadError) {
      // console.error("Error uploading image:", uploadError);
      // Clean up any temporary files that might still exist
      cleanupTemporaryFiles(subSubCategoryImages);
      return sendResponse(res, "Error uploading image to Cloudinary", 500, false);
    }

    // Create new sub-subcategory
    const subSubCategory = new SubSubCategory({
      name,
      slug,
      images: imagesArr, // Save array of Cloudinary URLs
      parentSubCategory: parentSubCategoryId,
    });

    await subSubCategory.save();

    return sendResponse(res, "Sub-subcategory created successfully", 201, true, {
      data: subSubCategory
    });
  } catch (error) {
    // console.error("Error creating sub-subcategory:", error);
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
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];
      return sendResponse(res, firstError.message, 400, false);
    }
    return sendResponse(res, "Error creating sub-subcategory", 500, false);
  }
};

// get BY ID
exports.getSubSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const subSubCategory = await SubSubCategory.findById(id).populate(
      "parentSubCategory",
      "name"
    );

    if (!subSubCategory) {
      return sendResponse(res, "Sub-subcategory not found", 404, false);
    }

    return sendResponse(res, "Sub-subcategory retrieved successfully", 200, true, {
      data: subSubCategory
    });
  } catch (error) {
    // console.error("Error fetching sub-subcategory by ID:", error);
    return sendResponse(res, "Error fetching sub-subcategory", 500, false);
  }
};

// get all
exports.getAllSubSubCategories = async (req, res) => {
  try {
    // adding pagination
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 0;
    const skip = (page - 1) * limit;
    const total = await SubSubCategory.countDocuments();

    const subSubCategories = await SubSubCategory.find()
      .skip(skip)
      .limit(limit)
      .populate({
        path: "parentSubCategory",
        select: "name slug images parentCategory",
        populate: {
          path: "parentCategory",
          select: "name"
        }
      });

    // Format the response to include only category name and id
    const formatted = subSubCategories.map((ssc) => {
      // Sub-subcategory images - now using Cloudinary URLs directly
      let subSubCategoryImageUrls = ssc.images || [];

      // Parent subcategory
      const parentSubCat = ssc.parentSubCategory;
      let parentSubCatImageUrls = [];
      if (parentSubCat && parentSubCat.images && parentSubCat.images.length > 0) {
        parentSubCatImageUrls = parentSubCat.images;
      }

      // Parent category (only name and id)
      const parentCat = parentSubCat && parentSubCat.parentCategory;

      return {
        id: ssc._id,
        name: ssc.name,
        slug: ssc.slug,
        images: subSubCategoryImageUrls,
        subCategory: parentSubCat
          ? {
              id: parentSubCat._id,
              name: parentSubCat.name,
              slug: parentSubCat.slug,
              images: parentSubCatImageUrls,
            }
          : null,
        category: parentCat
          ? {
              id: parentCat._id,
              name: parentCat.name
            }
          : null,
      };
    });

    return sendResponse(res, "Sub-subcategories retrieved successfully", 200, true, {
      data: formatted,
      total,
      page,
      limit
    });
  } catch (error) {
    // console.error("Error fetching sub-subcategories:", error);
    return sendResponse(res, "Error fetching sub-subcategories", 500, false);
  }
};

exports.updateSubSubCategory = async (req, res) => {
  try {
    const { name, parentSubCategoryId } = req.body;
    const subSubCategoryImages = req.files;

    // Get the existing sub-subcategory to access current images
    const existingSubSubCategory = await SubSubCategory.findById(req.params.id);
    if (!existingSubSubCategory) {
      return sendResponse(res, "Sub-subcategory not found", 404, false);
    }

    // Prepare update object (only name, images, parentSubCategory)
    const updateData = {
      name,
      parentSubCategory: parentSubCategoryId,
    };
    
    // Generate new slug if name is being updated
    if (name) {
      const newSlug = slugify(name, { lower: true, strict: true });
      updateData.slug = newSlug;
    }
    
    // Only update images if new images are uploaded
    if (subSubCategoryImages && subSubCategoryImages.length > 0) {
      // Delete old images from Cloudinary if they exist
      if (existingSubSubCategory.images && existingSubSubCategory.images.length > 0) {
        try {
          for (const imageUrl of existingSubSubCategory.images) {
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
      const uploadedFiles = [];
      const options = {
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      };

      try {
        for (let i = 0; i < subSubCategoryImages.length; i++) {
          const result = await cloudinary.uploader.upload(
            subSubCategoryImages[i].path,
            options
          );
          imagesArr.push(result.secure_url);
          uploadedFiles.push(subSubCategoryImages[i]);
          // Delete the temporary file after successful upload
          try {
            fs.unlinkSync(`uploads/${subSubCategoryImages[i].filename}`);
            // console.log(`Temporary file deleted: ${subSubCategoryImages[i].filename}`);
          } catch (deleteError) {
            // console.error(`Error deleting temporary file ${subSubCategoryImages[i].filename}:`, deleteError);
          }
        }
        updateData.images = imagesArr;
      } catch (uploadError) {
        // console.error("Error uploading image:", uploadError);
        // Clean up any temporary files that might still exist
        cleanupTemporaryFiles(subSubCategoryImages);
        return sendResponse(res, "Error uploading image to Cloudinary", 500, false);
      }
    }

    // Update the sub-subcategory
    const updated = await SubSubCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: "parentSubCategory",
      select: "name",
    });

    // Sub-subcategory image(s) - now using Cloudinary URLs directly
    let subSubCategoryImageUrls = updated.images || [];

    // Parent subcategory
    const parentSubCat = updated.parentSubCategory;

    const responseData = {
      id: updated._id,
      name: updated.name,
      slug: updated.slug,
      images: subSubCategoryImageUrls,
      subCategory: parentSubCat
        ? {
            id: parentSubCat._id,
            name: parentSubCat.name
          }
        : null,
    };

    return sendResponse(res, "Sub-subcategory updated successfully", 200, true, {
      data: responseData
    });
  } catch (error) {
    // console.error("Error updating sub-subcategory:", error);
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
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];
      return sendResponse(res, firstError.message, 400, false);
    }
    return sendResponse(res, "Error updating sub-subcategory", 500, false);
  }
};

exports.deleteSubSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the sub-subcategory to access its images before deletion
    const subSubCategory = await SubSubCategory.findById(id);
    if (!subSubCategory) {
      return sendResponse(res, "Sub-subcategory not found", 404, false);
    }

    // Delete images from Cloudinary if they exist
    if (subSubCategory.images && subSubCategory.images.length > 0) {
      try {
        for (const imageUrl of subSubCategory.images) {
          // Extract public_id from Cloudinary URL
          const publicId = extractPublicIdFromUrl(imageUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
      } catch (deleteError) {
        // console.error("Error deleting images from Cloudinary:", deleteError);
        // Continue with sub-subcategory deletion even if image deletion fails
      }
    }

    // Delete the sub-subcategory from database
    const deleted = await SubSubCategory.findByIdAndDelete(id);

    if (!deleted) {
      return sendResponse(res, "Sub-subcategory not found", 404, false);
    }

    return sendResponse(res, "Sub-subcategory deleted successfully", 200, true);
  } catch (error) {
    // console.error("Error deleting sub-subcategory:", error);
    return sendResponse(res, "Error deleting sub-subcategory", 500, false);
  }
};

exports.deleteAllSubSubCategory = async (req, res) => {
  try {
    // Get all sub-subcategories to access their images before deletion
    const allSubSubCategories = await SubSubCategory.find({});
    
    // Delete all images from Cloudinary
    for (const subSubCategory of allSubSubCategories) {
      if (subSubCategory.images && subSubCategory.images.length > 0) {
        try {
          for (const imageUrl of subSubCategory.images) {
            // Extract public_id from Cloudinary URL
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
          }
        } catch (deleteError) {
          // console.error("Error deleting images from Cloudinary for sub-subcategory:", subSubCategory._id, deleteError);
          // Continue with other deletions even if some fail
        }
      }
    }

    // Delete all sub-subcategories from database
    const result = await SubSubCategory.deleteMany({});
    
    return sendResponse(res, "All sub-subcategories deleted successfully", 200, true, {
      deletedCount: result.deletedCount
    });
  } catch (error) {
    // console.error("Error deleting all sub-subcategories:", error);
    return sendResponse(res, "Error deleting all sub-subcategories", 500, false);
  }
};

exports.getSubSubCategoriesBySubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;

    if (!subCategoryId) {
      return sendResponse(res, "SubCategory ID is required", 400, false);
    }

    const subSubCategories = await SubSubCategory.find({ parentSubCategory: subCategoryId })
      .populate({
        path: "parentSubCategory",
        select: "name slug",
        populate: {
          path: "parentCategory",
          select: "name slug images"
        }
      });

    const updatedSubSubCategories = subSubCategories.map((subSub) => {
      const parent = subSub.parentSubCategory;
      const grandParent = parent?.parentCategory;

      let imageUrl = null;
      if (grandParent && grandParent.images && grandParent.images.length > 0) {
        imageUrl = grandParent.images[0];
      }

      return {
        id: subSub._id,
        name: subSub.name,
        slug: subSub.slug,
        subCategory: parent
          ? {
              id: parent._id,
              name: parent.name,
              slug: parent.slug,
              category: grandParent
                ? {
                    id: grandParent._id,
                    name: grandParent.name,
                    slug: grandParent.slug,
                    imageUrl: imageUrl
                  }
                : null
            }
          : null
      };
    });

    return sendResponse(res, "Sub-subcategories retrieved successfully", 200, true, {
      data: updatedSubSubCategories,
      total: updatedSubSubCategories.length
    });
  } catch (error) {
    // console.error("Error fetching sub-subcategories by subcategory:", error);
    return sendResponse(res, "Error fetching sub-subcategories", 500, false);
  }
};

exports.getSubSubCategoryWithRelatedData = async (req, res) => {
  try {
    const { categorySlug, subCategorySlug, subSubCategorySlug } = req.params;

    if (!categorySlug || !subCategorySlug || !subSubCategorySlug) {
      return sendResponse(res, "Category slug, SubCategory slug, and SubSubCategory slug are required", 400, false);
    }

    // Find category by slug
    const category = await Category.findOne({ slug: categorySlug });
    if (!category) {
      return sendResponse(res, "Category not found", 404, false);
    }

    // Find subcategory by slug
    const subCategory = await SubCategory.findOne({
      slug: subCategorySlug,
      parentCategory: category._id
    });
    if (!subCategory) {
      return sendResponse(res, "SubCategory not found for given category", 404, false);
    }

    // Find sub-subcategory by slug
    const subSubCat = await SubSubCategory.findOne({
      slug: subSubCategorySlug,
      parentSubCategory: subCategory._id
    }).lean();

    if (!subSubCat) {
      return sendResponse(res, "SubSubCategory not found for given subcategory", 404, false);
    }

    // Fetch products that belong to this sub-subcategory
    const products = await Product.find({
      categories: category._id,
      subCategories: subCategory._id,
      subSubCategories: subSubCat._id
    })
      .select("discountedPrice color variants")
      .lean();

    // Format products
    const formattedProducts = products.map(prod => ({
      discountedPrice: prod.discountedPrice,
      color: prod.color,
      sizes: prod.variants?.map(variant => variant.size) || []
    }));

    const response = {
      subSubCategory: {
        id: subSubCat._id,
        name: subSubCat.name,
        slug: subSubCat.slug
      },
      products: formattedProducts,
      counts: {
        products: formattedProducts.length
      }
    };

    return sendResponse(res, "SubSubCategory data retrieved successfully", 200, true, {
      data: response
    });
  } catch (error) {
    // console.error("Error fetching subSubCategory data:", error);
    return sendResponse(res, "Error fetching subSubCategory data", 500, false);
  }
};

exports.getSubSubCategoriesByCategoryName = async (req, res) => {
  try {
    const { categoryName } = req.params;

    if (!categoryName) {
      return sendResponse(res, "Category name is required", 400, false);
    }

    // Find category by name (case-insensitive)
    const category = await Category.findOne({ 
      name: { $regex: new RegExp(`^${categoryName}$`, 'i') } 
    });

    if (!category) {
      return sendResponse(res, "Category not found", 404, false);
    }

    // Find all subcategories that belong to this category
    const subCategories = await SubCategory.find({ 
      parentCategory: category._id 
    }).select('_id slug');

    if (subCategories.length === 0) {
      return sendResponse(res, "No subcategories found for this category", 200, true, {
        data: [],
        total: 0
      });
    }

    // Map subcategory IDs to their slugs for quick lookup
    const subCategoryMap = {};
    subCategories.forEach(sub => {
      subCategoryMap[sub._id.toString()] = sub.slug;
    });
    const subCategoryIds = subCategories.map(sub => sub._id);

    // Find all sub-subcategories that belong to these subcategories
    const subSubCategories = await SubSubCategory.find({
      parentSubCategory: { $in: subCategoryIds }
    });

    // Format the response - include subcategory id and slug
    const formattedSubSubCategories = subSubCategories.map((subSub) => {
      // Sub-subcategory images - now using Cloudinary URLs directly
      let imageUrls = subSub.images || [];
      const subCatId = subSub.parentSubCategory?.toString();
      return {
        id: subSub._id,
        name: subSub.name,
        slug: subSub.slug,
        images: imageUrls,
        subCategory: subCatId && subCategoryMap[subCatId]
          ? {
              id: subCatId,
              slug: subCategoryMap[subCatId]
            }
          : null
      };
    });

    return sendResponse(res, "Sub-subcategories retrieved successfully", 200, true, {
      data: formattedSubSubCategories,
      total: formattedSubSubCategories.length
    });
  } catch (error) {
    // console.error("Error fetching sub-subcategories by category name:", error);
    return sendResponse(res, "Error fetching sub-subcategories", 500, false);
  }
};

