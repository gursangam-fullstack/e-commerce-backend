// validators/subSubCategoryValidator.js
const { z } = require("zod");

const createSubSubCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  parentSubCategoryId: z.string().min(1, "Parent SubCategory ID is required"),
});

const updateSubSubCategorySchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentSubCategoryId: z.string().optional(),
});

const categoryNameSchema = z.object({
  categoryName: z.string()
    .min(1, "Category name is required")
    .max(50, "Category name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Category name can only contain letters and spaces")
});

module.exports = {
  createSubSubCategorySchema,
  updateSubSubCategorySchema,
  categoryNameSchema,
};
