const { z } = require("zod");

// ObjectId validation
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ObjectId format");

// Create review schema
const createReviewSchema = z.object({
  productId: objectIdSchema.min(1, "Product ID is required"),
  rating: z.coerce.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().min(1, "Comment is required").max(500, "Comment too long").optional(),
});

// Update review schema
const updateReviewSchema = z.object({
  rating: z.coerce.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5").optional(),
  comment: z.string().min(1, "Comment is required").max(500, "Comment too long").optional(),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
}; 