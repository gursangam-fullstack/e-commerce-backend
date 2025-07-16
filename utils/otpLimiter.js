const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    success: false,
    error: true,
    message: "Too many rquestes . Try again later.",
});

module.exports = otpLimiter;