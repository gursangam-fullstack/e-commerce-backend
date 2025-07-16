const { z } = require("zod");

// ObjectId validation
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ObjectId format");

// Base variant schema
const variantSchema = z.object({
  size: z.string().optional().nullable(),
  stock: z.coerce.number().nonnegative("Stock must be a non-negative number"),
});

// Key Highlights Schema
const keyHighlightsSchema = z.object({
  design: z.string().nullable().optional(),
  fit: z.string().nullable().optional(),
  waistRise: z.string().nullable().optional(),
  distress: z.string().nullable().optional(),
  occasion: z.string().nullable().optional(),
  closure: z.string().nullable().optional(),
  sleeveStyle: z.string().nullable().optional(),
  washCare: z.string().nullable().optional(),
});

// Clothing Spec Schema
const clothingSpecSchema = z.object({
  fabric: z.string().nullable().optional(),
  fit: z.string().nullable().optional(),
  neck: z.string().nullable().optional(),
  sleeve: z.string().nullable().optional(),
  pattern: z.string().nullable().optional(),
  length: z.string().nullable().optional(),
  hemline: z.string().nullable().optional(),
  closureType: z.string().nullable().optional(),
  stretchable: z.boolean().optional(),
  careInstructions: z.string().nullable().optional(),
  transparency: z.string().nullable().optional(),
});

// Perfume Spec Schema
const perfumeSpecSchema = z.object({
  fragranceType: z.string().nullable().optional(),
  topNotes: z.string().nullable().optional(),
  middleNotes: z.string().nullable().optional(),
  baseNotes: z.string().nullable().optional(),
  longevity: z.string().nullable().optional(),
  sillage: z.string().nullable().optional(),
  volume: z.string().nullable().optional(),
  concentration: z.string().nullable().optional(),
  shelfLife: z.string().nullable().optional(),
  containerType: z.string().nullable().optional(),
  packagingType: z.string().nullable().optional(),
});

// Jewelry Spec Schema
const jewelrySpecSchema = z.object({
  material: z.string().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  warranty: z.string().nullable().optional(),
  finish: z.string().nullable().optional(),
  stoneType: z.string().nullable().optional(),
  baseMetal: z.string().nullable().optional(),
});

// Combined Specification Schema
const specificationSchema = z.object({
  clothing: clothingSpecSchema.optional().nullable(),
  perfume: perfumeSpecSchema.optional().nullable(),
  jewelry: jewelrySpecSchema.optional().nullable(),
});

// Helper function to parse JSON strings
const parseJsonString = (str, ctx) => {
  try {
    return JSON.parse(str);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid JSON format",
    });
    return z.NEVER;
  }
};

// Base product schema
const baseProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200, "Product name too long"),
  price: z.coerce.number().positive("Price must be a positive number").max(999999, "Price too high"),
  discountedPrice: z.coerce.number().positive("Discounted price must be a positive number").max(999999, "Discounted price too high").nullable().optional(),
  description: z.string().min(1, "Description is required").max(2000, "Description too long"),
  color: z.string().min(1, "Color is required").max(50, "Color name too long"),
  gender: z.enum(["male", "female", "unisex"], { required_error: "Gender is required" }),
  weight: z.string().max(50, "Weight too long").optional().nullable(),
  categoryIds: objectIdSchema.min(1, "Category ID is required"),
  subCategoryIds: objectIdSchema.min(1, "SubCategory ID is required"),
  subSubCategoryIds: objectIdSchema.min(1, "SubSubCategory ID is required"),
  variants: z.union([
    z.string().transform((str, ctx) => {
      const parsed = parseJsonString(str, ctx);
      if (!Array.isArray(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Variants must be an array",
        });
        return z.NEVER;
      }
      return parsed;
    }),
    z.array(variantSchema),
  ]).refine((val) => Array.isArray(val) && val.length > 0, {
    message: "At least one variant is required",
  }),
  keyHighlights: z.union([
    z.string().transform((str, ctx) => parseJsonString(str, ctx)),
    keyHighlightsSchema,
  ]).optional().nullable(),
  specifications: z.union([
    z.string().transform((str, ctx) => parseJsonString(str, ctx)),
    specificationSchema,
  ]).optional().nullable(),
});

// Full product schema with refine
const productSchema = baseProductSchema.refine(
  (data) => {
    if (data.discountedPrice !== null && data.discountedPrice !== undefined) {
      return data.discountedPrice <= data.price;
    }
    return true;
  },
  {
    message: "Discounted price must be less than or equal to the original price",
    path: ["discountedPrice"],
  }
);

// Update schema with all fields optional
const productUpdateSchema = baseProductSchema.partial();

module.exports = {
  productSchema,
  productUpdateSchema,
};
