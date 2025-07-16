
const { z } = require("zod");

const createSubCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  // slug: z.string().optional(),
  // description: z.string().optional(),
  parentCategoryId: z.string().min(1, "Parent category ID is required"), // Optional depending on logic
});

const updateSubCategorySchema = z.object({
  name: z.string().optional(),
  // slug: z.string().optional(),
  // description: z.string().optional(),
  parent: z.string().optional().nullable(),
});

module.exports = {
  createSubCategorySchema,
  updateSubCategorySchema,
};
