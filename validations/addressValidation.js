const { z } = require("zod");

const addressSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters")
    .regex(
      /^[A-Za-z\s'-]+$/,
      "First name must not contain numbers or special characters"
    ),
  lastName: z
    .string()
    .max(50, "Last name must be less than 50 characters")
    .regex(
      /^[A-Za-z\s'-]*$/,
      "Last name must not contain numbers or special characters"
    )
    .optional(),
  mobileNo: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  alternativeMobileNo: z
    .string()
    .regex(
      /^[6-9]\d{9}$/,
      "Please enter a valid 10-digit alternative mobile number"
    )
    .optional(),
  flatNo: z.string().min(1, "Flat number is required"),
  area: z.string().min(1, "Area is required"),
  landMark: z
    .string()
    .max(100, "Landmark must be under 100 characters")
    .optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().regex(/^\d{5,6}$/, "ZIP must be 5 or 6 digits"),
  country: z.string().min(1, "Country is required").default("India"),
});

module.exports = { addressSchema };
