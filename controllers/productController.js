const Product = require("../model/product");
const Review = require("../model/review");
const _ = require('lodash');
const sendResponse = require("../utils/sendResponse");
const slugify = require("slugify");
const Category = require("../model/category");
const SubCategory = require("../model/subCategory");
const SubSubCategory = require("../model/subSubCategory");
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
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
      const versionAndPublicId = urlParts.slice(uploadIndex + 2).join('/');
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

// Utility function to safely parse JSON
const safeJsonParse = (data, fieldName) => {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data || {};
  } catch (e) {
    throw new Error(`Invalid JSON format for ${fieldName}`);
  }
};

// Utility function to filter out falsy values except for specific fields
const filterValidValues = (obj, specialFields = []) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => {
      if (specialFields.includes(key)) return value !== undefined;
      return value;
    })
  );
};

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      weight,
      discountedPrice,
      color,
      gender,
      categoryIds,
      subCategoryIds,
      subSubCategoryIds,
      variants,
      keyHighlights,
      specifications
    } = req.body;

    // Validate required fields
    const requiredFields = { name, price, description, color, gender, categoryIds, subCategoryIds, subSubCategoryIds };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return sendResponse(res, `Missing required fields: ${missingFields.join(', ')}`, 400, false);
    }

    // Parse and validate variants
    let parsedVariants = [];
    try {
      parsedVariants = safeJsonParse(variants, 'variants');
      if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
        return sendResponse(res, "At least one variant is required", 400, false);
      }
    } catch (e) {
      return sendResponse(res, e.message, 400, false);
    }

    // Parse keyHighlights
    let parsedKeyHighlights = {};
    try {
      parsedKeyHighlights = safeJsonParse(keyHighlights, 'keyHighlights');
    } catch (e) {
      return sendResponse(res, e.message, 400, false);
    }

    // Parse specifications
    let parsedSpecifications = {};
    try {
      parsedSpecifications = safeJsonParse(specifications, 'specifications');
    } catch (e) {
      return sendResponse(res, e.message, 400, false);
    }

    // Generate slug
    const baseSlug = slugify(name, { lower: true, strict: true });
    const colorSlug = slugify(color, { lower: true, strict: true });
    const fullSlug = `${baseSlug}-${colorSlug}`;

    // Check for existing product (optimized query)
    const existingProduct = await Product.findOne({ 
      slug: fullSlug, 
      price: Number(price) 
    }).select('variants');

    if (existingProduct) {
      const isSameVariants = _.isEqual(existingProduct.variants, parsedVariants);
      if (isSameVariants) {
        return sendResponse(res, "Product with same slug, price and variants already exists", 400, false);
      }
    }

    // Handle image uploads to Cloudinary
    let imagesArr = [];
    const productImages = req.files;
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    };
    try {
      if (productImages && productImages.length > 0) {
        for (let i = 0; i < productImages.length; i++) {
          const result = await cloudinary.uploader.upload(
            productImages[i].path,
            options
          );
          imagesArr.push(result.secure_url);
          // Delete the temporary file after successful upload
          try {
            fs.unlinkSync(`uploads/${productImages[i].filename}`);
            // console.log(`Temporary file deleted: ${productImages[i].filename}`);
          } catch (deleteError) {
            // console.error(`Error deleting temporary file ${productImages[i].filename}:`, deleteError);
          }
        }
      }
    } catch (uploadError) {
      // console.error("Error uploading image:", uploadError);
      cleanupTemporaryFiles(productImages);
      return sendResponse(res, "Error uploading image to Cloudinary", 500, false);
    }

    // Prepare product data
    const productData = {
      name,
      slug: fullSlug,
      price: Number(price),
      description,
      weight,
      discountedPrice: discountedPrice ? Number(discountedPrice) : null,
      color,
      gender,
      categories: categoryIds,
      subCategories: subCategoryIds,
      subSubCategories: subSubCategoryIds,
      images: imagesArr,
      variants: parsedVariants
    };

    // Add keyHighlights if provided
    if (parsedKeyHighlights && Object.keys(parsedKeyHighlights).length > 0) {
      const filteredKeyHighlights = filterValidValues(parsedKeyHighlights);
      if (Object.keys(filteredKeyHighlights).length > 0) {
        productData.keyHighlights = filteredKeyHighlights;
      }
    }

    // Add specifications if provided
    if (parsedSpecifications && Object.keys(parsedSpecifications).length > 0) {
      const specificationData = {};
      
      // Process clothing specifications
      if (parsedSpecifications.clothing && Object.keys(parsedSpecifications.clothing).length > 0) {
        const filteredClothing = filterValidValues(parsedSpecifications.clothing, ['stretchable']);
        if (Object.keys(filteredClothing).length > 0) {
          specificationData.clothing = filteredClothing;
        }
      }

      // Process perfume specifications
      if (parsedSpecifications.perfume && Object.keys(parsedSpecifications.perfume).length > 0) {
        const filteredPerfume = filterValidValues(parsedSpecifications.perfume);
        if (Object.keys(filteredPerfume).length > 0) {
          specificationData.perfume = filteredPerfume;
        }
      }

      // Process jewelry specifications
      if (parsedSpecifications.jewelry && Object.keys(parsedSpecifications.jewelry).length > 0) {
        const filteredJewelry = filterValidValues(parsedSpecifications.jewelry);
        if (Object.keys(filteredJewelry).length > 0) {
          specificationData.jewelry = filteredJewelry;
        }
      }

      if (Object.keys(specificationData).length > 0) {
        productData.specifications = specificationData;
      }
    }

    // Create and save product
    const newProduct = await Product.create(productData);

    // Populate the saved product with category information (optimized query)
    const populatedProduct = await Product.findById(newProduct._id)
      .populate("categories", "name slug")
      .populate("subCategories", "name slug")
      .populate("subSubCategories", "name slug")
      .lean();

    return sendResponse(res, "Product created successfully", 201, true, {
      data: populatedProduct
    });
  } catch (error) {
    // console.error('Create Product Error:', error);
    
    // Handle specific error types
    if (error.code === 11000) {
      return sendResponse(res, "Product with this slug already exists", 400, false);
    }
    
    if (error.name === 'ValidationError') {
      // Map field names to error messages for clarity
      const validationErrors = Object.entries(error.errors).map(
        ([field, err]) => `${field}: ${err.message}`
      );
      return sendResponse(res, `Validation error: ${validationErrors.join(', ')}`, 400, false);
    }
    
    return sendResponse(res, "Error creating product", 500, false);
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    // pagination start
    const page = parseInt(req.query.page) ;
    const limit = parseInt(req.query.limit) ;
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments();

    const products = await Product.find()
      .skip(skip)
      .limit(limit)
      .populate("categories", "name slug")
      .populate("subCategories", "name slug")
      .populate("subSubCategories", "name slug");

    const updatedProducts = products.map((prod) => {
      const productImageUrls = prod.images || [];

      return {
        id: prod._id,
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        price: prod.price,
        discountedPrice: prod.discountedPrice,
        weight: prod.weight,
        color: prod.color ? String(prod.color).trim() : '',
        gender: prod.gender,
        categories: prod.categories,
        subCategories: prod.subCategories,
        subSubCategories: prod.subSubCategories,
        variants: prod.variants,
        images: productImageUrls,
        keyHighlights: prod.keyHighlights,
        specifications: prod.specifications,
        createdAt: prod.createdAt,
        updatedAt: prod.updatedAt,
      };
    });

    return sendResponse(res, "Products retrieved successfully", 200, true, {
      data: updatedProducts,
      total,
      page,
      limit
    });
  } catch (error) {
    // console.error("Get All Products Error:", error);
    return sendResponse(res, "Error fetching products", 500, false);
  }
};

exports.updateProduct = async (req, res) => {
  // console.log("body data",req.body);
  // console.log("calling outside");
  
  try {
    // console.log("calling inside");
    
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return sendResponse(res, "Product not found", 404, false);
    }

    // Extract fields from req.body with proper handling for form-data
    const {
      name,
      price,
      description,
      weight,
      discountedPrice,
      color,
      gender,
      categoryIds,
      subCategoryIds,
      subSubCategoryIds,
      variants,
      keyHighlights,
      specifications
    } = req.body;

    // console.log("data",name,
    //   price,
    //   description,
    //   weight,
    //   discountedPrice,
    //   color,
    //   gender,
    //   categoryIds,
    //   subCategoryIds,
    //   subSubCategoryIds,
    //   variants,
    //   keyHighlights,
    //   specifications)

    // Remove required fields empty validation for updateProduct
    // Allow partial updates: do not check for missing or empty fields

    // Helper function to check if a value is truly empty/missing
    const isEmpty = (value) => {
      return value === undefined || 
             value === null || 
             value === '' || 
             (Array.isArray(value) && value.length === 0) ||
             (typeof value === 'string' && value.trim() === '');
    };

    // Helper function to parse array fields (for form-data compatibility)
    const parseArrayField = (field, fieldName) => {
      if (isEmpty(field)) return [];
      if (typeof field === 'string') {
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(field);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          // If JSON parse fails, treat as comma-separated string
          return field.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      return Array.isArray(field) ? field : [field];
    };

    // Parse categoryIds, subCategoryIds, subSubCategoryIds for form-data if provided
    const parsedCategoryIds = !isEmpty(categoryIds) ? parseArrayField(categoryIds, 'categoryIds') : undefined;
    const parsedSubCategoryIds = !isEmpty(subCategoryIds) ? parseArrayField(subCategoryIds, 'subCategoryIds') : undefined;
    const parsedSubSubCategoryIds = !isEmpty(subSubCategoryIds) ? parseArrayField(subSubCategoryIds, 'subSubCategoryIds') : undefined;

    // Parse and validate variants if provided
    let parsedVariants = undefined;
    try {
      if (!isEmpty(variants)) {
        parsedVariants = safeJsonParse(variants, 'variants');
        if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
          return sendResponse(res, "At least one variant is required", 400, false);
        }
      }
    } catch (e) {
      return sendResponse(res, e.message, 400, false);
    }

    // Parse keyHighlights if provided
    let parsedKeyHighlights = undefined;
    try {
      if (!isEmpty(keyHighlights)) {
        parsedKeyHighlights = safeJsonParse(keyHighlights, 'keyHighlights');
      }
    } catch (e) {
      return sendResponse(res, e.message, 400, false);
    }

    // Parse specifications if provided
    let parsedSpecifications = undefined;
    try {
      if (!isEmpty(specifications)) {
        parsedSpecifications = safeJsonParse(specifications, 'specifications');
      }
    } catch (e) {
      return sendResponse(res, e.message, 400, false);
    }

    // Validate and convert price (handle string input from form-data)
    let numericPrice = undefined;
    if (!isEmpty(price)) {
      numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return sendResponse(res, "Price must be a valid positive number", 400, false);
      }
    }

    // Validate and convert discountedPrice if provided
    let numericDiscountedPrice = undefined;
    if (!isEmpty(discountedPrice)) {
      numericDiscountedPrice = Number(discountedPrice);
      if (isNaN(numericDiscountedPrice) || numericDiscountedPrice < 0) {
        return sendResponse(res, "Discounted price must be a valid non-negative number", 400, false);
      }
      if (numericPrice !== undefined && numericDiscountedPrice >= numericPrice) {
        return sendResponse(res, "Discounted price must be less than the original price", 400, false);
      }
    }

    // Generate slug if name or color is provided
    let fullSlug = product.slug;
    if (!isEmpty(name) || !isEmpty(color)) {
      const baseSlug = slugify((!isEmpty(name) ? name : product.name).trim(), { lower: true, strict: true });
      const colorSlug = slugify((!isEmpty(color) ? color : product.color).trim(), { lower: true, strict: true });
      fullSlug = `${baseSlug}-${colorSlug}`;
    }

    // Prepare update data (only update fields that are provided)
    if (!isEmpty(name)) product.name = name.trim();
    product.slug = fullSlug;
    if (numericPrice !== undefined) product.price = numericPrice;
    if (!isEmpty(description)) product.description = description.trim();
    if (!isEmpty(weight)) product.weight = weight.trim();
    if (numericDiscountedPrice !== undefined) product.discountedPrice = numericDiscountedPrice;
    if (!isEmpty(color)) product.color = color.trim();
    if (!isEmpty(gender)) product.gender = gender;
    if (parsedCategoryIds !== undefined) product.categories = parsedCategoryIds;
    if (parsedSubCategoryIds !== undefined) product.subCategories = parsedSubCategoryIds;
    if (parsedSubSubCategoryIds !== undefined) product.subSubCategories = parsedSubSubCategoryIds;
    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary
      if (product.images && product.images.length > 0) {
        try {
          for (const imageUrl of product.images) {
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
          }
        } catch (deleteError) {
          // console.error("Error deleting old images from Cloudinary:", deleteError);
        }
      }
      // Upload new images to Cloudinary
      const productImages = req.files;
      const imagesArr = [];
      const options = {
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      };
      try {
        for (let i = 0; i < productImages.length; i++) {
          const result = await cloudinary.uploader.upload(
            productImages[i].path,
            options
          );
          imagesArr.push(result.secure_url);
          // Delete the temporary file after successful upload
          try {
            fs.unlinkSync(`uploads/${productImages[i].filename}`);
            // console.log(`Temporary file deleted: ${productImages[i].filename}`);
          } catch (deleteError) {
            // console.error(`Error deleting temporary file ${productImages[i].filename}:`, deleteError);
          }
        }
        product.images = imagesArr;
      } catch (uploadError) {
        // console.error("Error uploading image:", uploadError);
        cleanupTemporaryFiles(productImages);
        return sendResponse(res, "Error uploading image to Cloudinary", 500, false);
      }
    }
    if (parsedVariants !== undefined) product.variants = parsedVariants;

    // Add keyHighlights if provided
    if (parsedKeyHighlights !== undefined) {
      if (parsedKeyHighlights && Object.keys(parsedKeyHighlights).length > 0) {
        const filteredKeyHighlights = filterValidValues(parsedKeyHighlights);
        if (Object.keys(filteredKeyHighlights).length > 0) {
          product.keyHighlights = filteredKeyHighlights;
        } else {
          product.keyHighlights = undefined;
        }
      } else {
        product.keyHighlights = undefined;
      }
    }

    // Add specifications if provided
    if (parsedSpecifications !== undefined) {
      if (parsedSpecifications && Object.keys(parsedSpecifications).length > 0) {
        const specificationData = {};
        // Process clothing specifications
        if (parsedSpecifications.clothing && Object.keys(parsedSpecifications.clothing).length > 0) {
          const filteredClothing = filterValidValues(parsedSpecifications.clothing, ['stretchable']);
          if (Object.keys(filteredClothing).length > 0) {
            specificationData.clothing = filteredClothing;
          }
        }
        // Process perfume specifications
        if (parsedSpecifications.perfume && Object.keys(parsedSpecifications.perfume).length > 0) {
          const filteredPerfume = filterValidValues(parsedSpecifications.perfume);
          if (Object.keys(filteredPerfume).length > 0) {
            specificationData.perfume = filteredPerfume;
          }
        }
        // Process jewelry specifications
        if (parsedSpecifications.jewelry && Object.keys(parsedSpecifications.jewelry).length > 0) {
          const filteredJewelry = filterValidValues(parsedSpecifications.jewelry);
          if (Object.keys(filteredJewelry).length > 0) {
            specificationData.jewelry = filteredJewelry;
          }
        }
        if (Object.keys(specificationData).length > 0) {
          product.specifications = specificationData;
        } else {
          product.specifications = undefined;
        }
      } else {
        product.specifications = undefined;
      }
    }

    await product.save();

    // Populate the updated product with category information
    const populatedProduct = await Product.findById(product._id)
      .populate("categories", "name slug")
      .populate("subCategories", "name slug")
      .populate("subSubCategories", "name slug")
      .lean();

    return sendResponse(res, "Product updated successfully", 200, true, {
      data: populatedProduct
    });
  } catch (error) {
    // console.error('Update Product Error:', error);
    // console.log("called error side ");
    
    
    if (error.code === 11000) {
      return sendResponse(res, "Product with this slug already exists", 400, false);
    }
    
    if (error.name === 'ValidationError') {
      // Map field names to error messages for clarity
      const validationErrors = Object.entries(error.errors).map(
        ([field, err]) => `${field}: ${err.message}`
      );
      return sendResponse(res, `Validation error: ${validationErrors.join(', ')}`, 400, false);
    }
    
    return sendResponse(res, "Error updating product", 500, false);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    // Get the product to access its images before deletion
    const product = await Product.findById(id);
    if (!product) {
      return sendResponse(res, "Product not found", 404, false);
    }
    // Delete images from Cloudinary if they exist
    if (product.images && product.images.length > 0) {
      try {
        for (const imageUrl of product.images) {
          const publicId = extractPublicIdFromUrl(imageUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
      } catch (deleteError) {
        // console.error("Error deleting images from Cloudinary:", deleteError);
      }
    }
    // Delete the product from database
    const deletedProduct = await Product.findByIdAndDelete(id);
    return sendResponse(res, "Product deleted successfully", 200, true);
  } catch (error) {
    // console.error("Delete product error:", error);
    return sendResponse(res, "Error deleting product", 500, false);
  }
};

exports.deleteAllProducts = async (req, res) => {
  try {
    // Get all products to access their images before deletion
    const allProducts = await Product.find({});
    // Delete all images from Cloudinary
    for (const product of allProducts) {
      if (product.images && product.images.length > 0) {
        try {
          for (const imageUrl of product.images) {
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
          }
        } catch (deleteError) {
          // console.error("Error deleting images from Cloudinary for product:", product._id, deleteError);
        }
      }
    }
    // Delete all products from database
    const result = await Product.deleteMany({});
    return sendResponse(res, "All products deleted successfully", 200, true, {
      deletedCount: result.deletedCount
    });
  } catch (error) {
    // console.error("Delete all products error:", error);
    return sendResponse(res, "Error deleting all products", 500, false);
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id; // Optional - user might not be logged in
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const product = await Product.findById(id)
      .populate("categories", "name slug")
      .populate("subCategories", "name slug")
      .populate("subSubCategories", "name slug")
      .lean();

    if (!product) {
      return sendResponse(res, "Product not found", 404, false);
    }

    // Format product images
    const productImageUrls = product.images || [];

    // Get reviews for this product
    const totalReviews = await Review.countDocuments({ product: id });
    
    const reviews = await Review.find({ product: id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate rating statistics
    const ratingStats = await Review.aggregate([
      { $match: { product: product._id } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          ratingDistribution: {
            $push: "$rating"
          }
        }
      }
    ]);

    let stats = {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    if (ratingStats.length > 0) {
      const ratingData = ratingStats[0];
      stats.totalReviews = ratingData.totalReviews;
      stats.averageRating = Number(ratingData.averageRating.toFixed(1));
      
      // Calculate rating distribution
      ratingData.ratingDistribution.forEach(rating => {
        stats.ratingDistribution[rating]++;
      });
    }

    // Check if user has already reviewed this product
    let userReview = null;
    if (userId) {
      userReview = await Review.findOne({ product: id, user: userId }).lean();
    }

    // Format the product data
    const formattedProduct = {
      id: product._id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      discountedPrice: product.discountedPrice,
      description: product.description,
      weight: product.weight,
      color: product.color,
      gender: product.gender,
      images: productImageUrls,
      variants: product.variants,
      keyHighlights: product.keyHighlights,
      specifications: product.specifications,
      categories: product.categories,
      subCategories: product.subCategories,
      subSubCategories: product.subSubCategories,
      averageRating: product.averageRating || 0,
      numReviews: product.numReviews || 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    return sendResponse(res, "Product retrieved successfully", 200, true, {
      data: {
        product: formattedProduct,
        reviews,
        stats,
        userReview,
        pagination: {
          total: totalReviews,
          page,
          limit,
          totalPages: Math.ceil(totalReviews / limit)
        }
      }
    });
  } catch (error) {
    // console.error("Get product by ID error:", error);
    return sendResponse(res, "Error fetching product", 500, false);
  }
};

exports.getProductsByFilters = async (req, res) => {
  try {
    const {
      category,
      subCategory,
      subSubCategory,
      minPrice,
      maxPrice,
      color,
      size,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit
    } = req.query;

    // console.log(category, subCategory, subSubCategory, minPrice, maxPrice, color, size)

    // Build filter object
    const filter = {};

    // Category filters - Handle multiple values
    if (category) {
      const categoryArray = Array.isArray(category) ? category : category.split(',');
      const categories = await Category.find({ slug: { $in: categoryArray } });
      if (categories.length > 0) {
        filter.categories = { $in: categories.map(cat => cat._id) };
      }
    }

    if (subCategory) {
      const subCategoryArray = Array.isArray(subCategory) ? subCategory : subCategory.split(',');
      const subCategories = await SubCategory.find({ slug: { $in: subCategoryArray } });
      if (subCategories.length > 0) {
        filter.subCategories = { $in: subCategories.map(subCat => subCat._id) };
      }
    }

    if (subSubCategory) {
      const subSubCategoryArray = Array.isArray(subSubCategory) ? subSubCategory : subSubCategory.split(',');
      const subSubCategories = await SubSubCategory.find({ slug: { $in: subSubCategoryArray } });
      if (subSubCategories.length > 0) {
        filter.subSubCategories = { $in: subSubCategories.map(subSubCat => subSubCat._id) };
      }
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.discountedPrice = {};
      if (minPrice) filter.discountedPrice.$gte = Number(minPrice);
      if (maxPrice) filter.discountedPrice.$lte = Number(maxPrice);
    }

    // Color filter - Handle multiple colors with case-insensitive search
    if (color) {
      const colorArray = Array.isArray(color) ? color : color.split(',');
      filter.color = { $in: colorArray.map(c => new RegExp(`^${c}$`, 'i')) };
    }

    // Size filter (check in variants array) - Handle multiple sizes
    if (size) {
      const sizeArray = Array.isArray(size) ? size : size.split(',');
      filter['variants'] = {
        $elemMatch: {
          size: { $in: sizeArray }
        }
      };
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (page - 1) * (limit || 0);
    const total = await Product.countDocuments(filter);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with filters
    const products = limit
      ? await Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate("categories", "name slug")
        .populate("subCategories", "name slug")
        .populate("subSubCategories", "name slug")
      : await Product.find(filter)
        .sort(sort)
        .populate("categories", "name slug")
        .populate("subCategories", "name slug")
        .populate("subSubCategories", "name slug");

    // Format response
    const updatedProducts = products.map((prod) => {
      const filterImageUrls = prod.images || [];

      return {
        id: prod._id,
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        price: prod.price,
        discountedPrice: prod.discountedPrice,
        weight: prod.weight,
        color: prod.color ? String(prod.color).trim() : '',
        gender: prod.gender,
        categories: prod.categories,
        subCategories: prod.subCategories,
        subSubCategories: prod.subSubCategories,
        variants: prod.variants,
        images: filterImageUrls,
        keyHighlights: prod.keyHighlights,
        specifications: prod.specifications,
        createdAt: prod.createdAt,
        updatedAt: prod.updatedAt,
      };
    });

    return sendResponse(res, "Products retrieved successfully", 200, true, {
      data: updatedProducts,
      total,
      page: Number(page),
      limit: limit ? Number(limit) : total,
      filters: {
        category: category ? (Array.isArray(category) ? category : category.split(',')) : undefined,
        subCategory: subCategory ? (Array.isArray(subCategory) ? subCategory : subCategory.split(',')) : undefined,
        subSubCategory: subSubCategory ? (Array.isArray(subSubCategory) ? subSubCategory : subSubCategory.split(',')) : undefined,
        minPrice,
        maxPrice,
        color: color ? (Array.isArray(color) ? color : color.split(',')) : undefined,
        size: size ? (Array.isArray(size) ? size : size.split(',')) : undefined,
        search,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    // console.error("Get Products By Filters Error:", error);
    return sendResponse(res, "Error fetching products", 500, false);
  }
};

exports.getProductWithRelatedData = async (req, res) => {
  try {
    const { categorySlug, subCategorySlug, subSubCategorySlug, productSlug } = req.params;

    if (!categorySlug || !subCategorySlug || !subSubCategorySlug || !productSlug) {
      return sendResponse(res, "Category slug, SubCategory slug, SubSubCategory slug, and Product slug are required", 400, false);
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
    const subSubCategory = await SubSubCategory.findOne({
      slug: subSubCategorySlug,
      parentSubCategory: subCategory._id
    });
    if (!subSubCategory) {
      return sendResponse(res, "SubSubCategory not found for given subcategory", 404, false);
    }

    // Find product by slug and verify it belongs to the correct hierarchy
    const product = await Product.findOne({
      slug: productSlug,
      categories: category._id,
      subCategories: subCategory._id,
      subSubCategories: subSubCategory._id
    }).lean();

    if (!product) {
      return sendResponse(res, "Product not found for given category hierarchy", 404, false);
    }

    // Format product data
    const formattedProduct = {
      id: product._id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      discountedPrice: product.discountedPrice,
      description: product.description,
      weight: product.weight,
      color: product.color,
      gender: product.gender,
      images: product.images || [],
      variants: product.variants.map(variant => ({
        size: variant.size,
        stock: variant.stock
      })),
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug
      },
      subCategory: {
        id: subCategory._id,
        name: subCategory.name,
        slug: subCategory.slug
      },
      subSubCategory: {
        id: subSubCategory._id,
        name: subSubCategory.name,
        slug: subSubCategory.slug
      }
    };

    return sendResponse(res, "Product data retrieved successfully", 200, true, {
      data: formattedProduct
    });
  } catch (error) {
    // console.error("Error fetching product data:", error);
    return sendResponse(res, "Error fetching product data", 500, false);
  }
};

exports.getAllProductColorsAndSizes = async (req, res) => {
  try {
    const products = await Product.find({}, 'color variants weight');
    
    // Extract unique colors, sizes and weights
    const colors = [...new Set(products.map(product => product.color))];
    const sizes = [...new Set(products.flatMap(product => 
      product.variants.map(variant => variant.size).filter(size => size !== null)
    ))];
    const weights = [...new Set(products.map(product => product.weight).filter(weight => weight !== null))];

    return sendResponse(res, "Product colors, sizes and weights retrieved successfully", 200, true, {
      data: {
        colors,
        sizes,
        weights
      }
    });
  } catch (error) {
    // console.error("Get product colors, sizes and weights error:", error);
    return sendResponse(res, "Error fetching product colors, sizes and weights", 500, false);
  }
};

exports.getAllProductColorsAndSizesBySearch = async (req, res) => {
  try {
    const { search } = req.query;

    // Build filter based on search query
    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' }; // Case-insensitive match on name
    }

    // Fetch only relevant fields
    const products = await Product.find(filter, 'color variants weight');

    // Extract unique values
    const colors = [...new Set(products.map(product => product.color).filter(Boolean))];
    const sizes = [...new Set(products.flatMap(product => 
      product.variants.map(variant => variant.size).filter(Boolean)
    ))];
    const weights = [...new Set(products.map(product => product.weight).filter(Boolean))];

    return sendResponse(res, "Product colors, sizes and weights retrieved successfully", 200, true, {
      data: {
        colors,
        sizes,
        weights
      }
    });
  } catch (error) {
    // console.error("Get product colors, sizes and weights error:", error);
    return sendResponse(res, "Error fetching product colors, sizes and weights", 500, false);
  }
};

exports.getRelatedProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const skip = (page - 1) * limit;

    // Find the main product first
    const mainProduct = await Product.findOne({ slug })
      .populate('categories', '_id')
      .populate('subCategories', '_id')
      .populate('subSubCategories', '_id');

    if (!mainProduct) {
      return sendResponse(res, "Product not found", 404, false);
    }

    // Build filter to find related products
    const filter = {
      _id: { $ne: mainProduct._id }, // Exclude the main product
      $and: [
        // Must match the same subcategory (e.g., tshirt)
        { subCategories: { $in: mainProduct.subCategories } }
      ]
    };

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    // Find related products with pagination
    const relatedProducts = await Product.find(filter)
      .skip(skip)
      .limit(limit)
      .populate("categories", "name slug")
      .populate("subCategories", "name slug")
      .populate("subSubCategories", "name slug");

    // Format the response
    const formattedProducts = relatedProducts.map(prod => {
      // const productImageUrls = prod.images?.map(
      //   (img) => `${req.protocol}://${req.get("host")}/uploads/${img}`
      // ) || [];
      const productImageUrls = prod.images || [];

      return {
        id: prod._id,
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        price: prod.price,
        discountedPrice: prod.discountedPrice,
        weight: prod.weight,
        color: prod.color ? String(prod.color).trim() : '',
        gender: prod.gender,
        categories: prod.categories,
        subCategories: prod.subCategories,
        subSubCategories: prod.subSubCategories,
        variants: prod.variants,
        images: productImageUrls,
        createdAt: prod.createdAt,
        updatedAt: prod.updatedAt,
      };
    });

    return sendResponse(res, "Related products retrieved successfully", 200, true, {
      data: formattedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    // console.error("Get related products error:", error);
    return sendResponse(res, "Error fetching related products", 500, false);
  }
};

// Get comprehensive product details with reviews
exports.getProductDetailsWithReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const userId = req.user?._id; // Optional - user might not be logged in

    // Get product with all related data
    const product = await Product.findById(productId)
      .populate("categories", "name slug")
      .populate("subCategories", "name slug")
      .populate("subSubCategories", "name slug")
      .lean();

    if (!product) {
      return sendResponse(res, "Product not found", 404, false);
    }

    // Format product images
    const productImageUrls = product.images || [];

    // Get reviews for this product
    const totalReviews = await Review.countDocuments({ product: productId });
    
    const reviews = await Review.find({ product: productId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate rating statistics
    const ratingStats = await Review.aggregate([
      { $match: { product: product._id } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          ratingDistribution: {
            $push: "$rating"
          }
        }
      }
    ]);

    let stats = {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    if (ratingStats.length > 0) {
      const ratingData = ratingStats[0];
      stats.totalReviews = ratingData.totalReviews;
      stats.averageRating = Number(ratingData.averageRating.toFixed(1));
      
      // Calculate rating distribution
      ratingData.ratingDistribution.forEach(rating => {
        stats.ratingDistribution[rating]++;
      });
    }

    // Check if user has already reviewed this product
    let userReview = null;
    if (userId) {
      userReview = await Review.findOne({ product: productId, user: userId }).lean();
    }

    // Format the main product data
    const formattedProduct = {
      id: product._id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      discountedPrice: product.discountedPrice,
      description: product.description,
      weight: product.weight,
      color: product.color,
      gender: product.gender,
      images: productImageUrls,
      variants: product.variants,
      keyHighlights: product.keyHighlights,
      specifications: product.specifications,
      categories: product.categories,
      subCategories: product.subCategories,
      subSubCategories: product.subSubCategories,
      averageRating: product.averageRating || 0,
      numReviews: product.numReviews || 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    return sendResponse(res, "Product details with reviews retrieved successfully", 200, true, {
      data: {
        product: formattedProduct,
        reviews,
        stats,
        userReview,
        pagination: {
          total: totalReviews,
          page,
          limit,
          totalPages: Math.ceil(totalReviews / limit)
        }
      }
    });
  } catch (error) {
    // console.error('Get Product Details With Reviews Error:', error);
    return sendResponse(res, "Error fetching product details", 500, false);
  }
};
