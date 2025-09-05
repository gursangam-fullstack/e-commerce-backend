const { z } = require("zod");
const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
// OTP validation schema
const otpSchema = z.string()
  .nonempty("OTP is required")
  .regex(/^\d{6}$/, "OTP must be a 6-digit number");


const userRegistrationSchema = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .min(3, " Name must be atleast 3 characters long")
    .max(20, "name must be less than 20 characters")
    .regex(nameRegex, "Name must contain only alphabets and single spaces, no special characters or numbers"),

  email: z
    .string()
    .nonempty("Email is required")
    .email("Invalid email address"),

  mobile: z
    .string()
    .nonempty("Mobile number is required")
    .regex(/^[6-9]\d{9}$/, "Invalid mobile number"),

  password: z
    .string()
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&_])[A-Za-z\d@$!%*?#&_]{8,}$/,
      "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

const verifyUserOtpSchema = z.object({
  email: z.string().nonempty("Email is required").email("Invalid email address"),
  otp: otpSchema,
})

const LoginFormSchema = z.object({
  email: z
    .string()
    .nonempty("Email is required")
    .email("Invalid email address"),

  password: z
    .string()
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&_])[A-Za-z\d@$!%*?#&_]{8,}$/,
      "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character"
    )

})

const changePasswordSchema = z.object({
  oldPassword: z
    .string()
    .nonempty("Old password is required"),

  newPassword: z
    .string()
    .nonempty("New password is required")
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&_])[A-Za-z\d@$!%*?#&_]{8,}$/,
      "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  confirmPassword: z
    .string()
    .nonempty("Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "New password and confirm password do not match",
});

const forgotPasswordOtpSchema = z.object({
  email: z
    .string()
    .nonempty("Email is required")
    .email("Invalid email address"),
});

const verifyForgotPasswordOtpSchema = z.object({
  email: z
    .string()
    .nonempty("Email is required")
    .email("Invalid email address"),

  otp: otpSchema,

  newPassword: z
    .string()
    .nonempty("New password is required")
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&_])[A-Za-z\d@$!%*?#&_]{8,}$/,
      "Password must include uppercase, lowercase, number, and special character"
    ),

  confirmPassword: z
    .string()
    .nonempty("Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ['confirmPassword'],
  message: "New password and confirm password do not match",
});

module.exports = {
  userRegistrationSchema,
  LoginFormSchema,
  changePasswordSchema,
  forgotPasswordOtpSchema,
  verifyUserOtpSchema,
  verifyForgotPasswordOtpSchema,
  otpSchema
};



