// validateCreateProduct.js
const { productSchema, productUpdateSchema } = require('../validation/productValidation');

exports.validateCreateProduct = (req, res, next) => {
  try {
    // console.log("=== START: Validation Middleware ===");
    // console.log("1. Raw request body before validation:", JSON.stringify(req.body, null, 2));

    // Image count validation
    if (!req.files || req.files.length < 5 || req.files.length > 8) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "You must upload between 5 and 8 images."
      });
    }

    // Validate the request body
    req.body = productSchema.parse(req.body);
    
    // console.log("2. Request body after validation:", JSON.stringify(req.body, null, 2));
    // console.log("=== END: Validation Middleware ===");
    next();
  } catch (error) {
    if (error.name === "ZodError") {
      // Handle multiple validation errors
      const errorMessages = error.errors.map(err => {
        const field = err.path.join('.');
        return `${field}: ${err.message}`;
      });
      
      return res.status(400).json({
        success: false,
        error: true,
        message: "Validation failed",
        errors: errorMessages
      });
    }
    next(error);
  }
};

// validateUpdateProduct.js
exports.validateUpdateProduct = (req, res, next) => {
  try {
    // Image count validation
    if (!req.files || req.files.length < 5 || req.files.length > 8) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "You must upload between 5 and 8 images."
      });
    }
    req.body = productUpdateSchema.parse(req.body);
    next();
  } catch (error) {
    if (error.name === "ZodError") {
      // Handle multiple validation errors
      const errorMessages = error.errors.map(err => {
        const field = err.path.join('.');
        return `${field}: ${err.message}`;
      });
      
      return res.status(400).json({
        success: false,
        error: true,
        message: "Validation failed",
        errors: errorMessages
      });
    }
    next(error);
  }
};

// Middleware to parse and normalize form-data fields before validation
exports.parseProductFormData = (req, res, next) => {
  // Helper to parse JSON fields safely
  const safeParse = (field) => {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return field; // fallback to string if not JSON
      }
    }
    return field;
  };

  // Parse fields that should be arrays/objects
  if (req.body.variants) req.body.variants = safeParse(req.body.variants);
  if (req.body.keyHighlights) req.body.keyHighlights = safeParse(req.body.keyHighlights);
  if (req.body.specifications) req.body.specifications = safeParse(req.body.specifications);
  if (req.body.categoryIds) req.body.categoryIds = safeParse(req.body.categoryIds);
  if (req.body.subCategoryIds) req.body.subCategoryIds = safeParse(req.body.subCategoryIds);
  if (req.body.subSubCategoryIds) req.body.subSubCategoryIds = safeParse(req.body.subSubCategoryIds);

  // Optionally, parse numbers
  if (req.body.price) req.body.price = Number(req.body.price);
  if (req.body.discountedPrice) req.body.discountedPrice = Number(req.body.discountedPrice);

  next();
};
