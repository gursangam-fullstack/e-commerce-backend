const { createReviewSchema, updateReviewSchema } = require('../validation/reviewValidation');

exports.validateCreateReview = (req, res, next) => {
  try {
    // console.log("=== START: Review Validation Middleware ===");
    // console.log("1. Raw request body before validation:", JSON.stringify(req.body, null, 2));

    // Validate the request body
    req.body = createReviewSchema.parse(req.body);
    
    // console.log("2. Request body after validation:", JSON.stringify(req.body, null, 2));
    // console.log("=== END: Review Validation Middleware ===");
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

exports.validateUpdateReview = (req, res, next) => {
  try {
    req.body = updateReviewSchema.parse(req.body);
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