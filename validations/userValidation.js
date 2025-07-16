const { z } = require('zod');

const SignupFormSchema = z.object({
    name: z
        .string()
        .min(2, "Name must be at least 2 characters long")
        .max(50, "Name must be at most 50 characters long")
        .regex(/^[a-zA-Z\s]+$/, "Name must only contain letters and spaces (no numbers or special characters)")
        .nonempty("Name is required"),

    email: z
        .string()
        .email("Invalid email address")
        .nonempty("Email is required"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&_])[A-Za-z\d@$!%*?#&_]{8,}$/,
            "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character"
        )
        .nonempty("Password is required"),

    mobile: z
        .string()
        .regex(/^[6-9]\d{9}$/, "Invalid mobile number")
        .nonempty("Mobile number is required"),
});

const OtpVerifyFormSchema = z.object({
    email: z
        .string()
        .email("Invalid email address")
        .nonempty("Email is required"),

    otp: z
        .string()
        .regex(/^\d{6}$/, "OTP must be a 6-digit number")
        .nonempty("OTP is required"),
});

const LoginFormSchema = z.object({
    email: z
        .string()
        .email("Invalid email address")
        .nonempty("Email is required"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&_])[A-Za-z\d@$!%*?#&_]{8,}$/,
            "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character"
        )
        .nonempty("Password is required"),
})

const ForgotPasswordEmailFormSchema = z.object({
    email: z
        .string()
        .email("Invalid email address")
        .nonempty("Email is required"),
})

const ForgotPasswordFormSchema = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().min(4, "OTP must be at least 4 characters"),
    newPassword: z
        .string()
        .min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
});

module.exports = {
    SignupFormSchema,
    OtpVerifyFormSchema,
    LoginFormSchema,
    ForgotPasswordEmailFormSchema,                                           
    ForgotPasswordFormSchema
};
