// validators/categoryValidator.js
const { z } = require("zod");

const createCategorySchema = z.object({
  name: z.string().min(1, "category is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
});

const updateCategorySchema = createCategorySchema.partial(); // All fields optional for update

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
