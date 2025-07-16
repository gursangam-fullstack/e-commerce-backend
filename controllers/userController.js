const sendResponse = require("../utils/sendResponse");

const bcrypt = require('bcrypt')
const generateOtp = require('../utils/generateOtp')
const sendEmailFun = require('../config/sendEmail')
const VerificationEmail = require('../utils/verifyEmailTemplate')
const tempUser = require('../model/tempUser');
const { generateTokens } = require("../utils/generateTokens");
const { setTokensCookies } = require("../utils/setTokensCookies");
const userRefreshTokenModel = require('../model/userRefreshToken');
const { OAuth2Client } = require("google-auth-library");
const userModel = require("../model/user");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)


// user registration
exports.userRegistration = async (req, res) => {
    const { name, email, mobile, password } = req.body;

    try {

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return sendResponse(res, "User already exists", 400, false);
        }

        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        const hashedPassword = await bcrypt.hash(password, salt);

        const { otp, otpExpiresAt } = generateOtp(10);

        await tempUser.findOneAndUpdate(
            { email },
            { name, email, mobile, passwordHash: hashedPassword, otp, otpExpiresAt },
            { upsert: true, new: true }
        );

        console.log(`OTP for ${email}: ${otp} ${name}`);

        sendEmailFun({
            to: email,
            subject: "Verify Your Email - Ecommerce",
            text: "test",
            html: VerificationEmail(name, otp),
        }).catch(err => {
            // console.error("Failed to send email:", err);
        });

        return sendResponse(res, "OTP sent successfully", 200, true);
    } catch (err) {
        // console.error("Error in user registration:", err);
        return sendResponse(res, "Unable to register please try again later", 500, false);
    }
};

// user Email Verification
exports.verifyTempUser = async (req, res) => {
    // console.log("verifyTempUser", req.body);
    const { email, otp } = req.body;

    try {
        const tempUserData = await tempUser.findOne({ email });

        if (
            !tempUserData ||
            tempUserData.otp !== otp ||
            tempUserData.otpExpiresAt < new Date()
        ) {
            return sendResponse(res, "Invalid or expired OTP", 400, false);
        }

        await new UserModel({
            name: tempUserData.name,
            email: tempUserData.email,
            mobile: tempUserData.mobile,
            password: tempUserData.passwordHash,
        }).save();

        await tempUser.deleteOne({ email });

        return sendResponse(res, "Eamil verified", 200, true);

    } catch (err) {
        // console.error("Error in verifyTempUser:", err);
        return sendResponse(res, "Unable to verify otp please try again later", 500, false);
    }
};

// user login
exports.userLogin = async (req, res) => { 
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            return sendResponse(res, "Invalid email or password", 404, false)
        }

        const isMatchPassword = await bcrypt.compare(password, user.password);
        if (!isMatchPassword) {
            return sendResponse(res, "Invalid email or password", 401, false)
        }

        //generate token
        let tokens;
        try {
            tokens = await generateTokens(user);
        } catch (err) {
            // console.log(err);
            return sendResponse(res, "Unable to create access or refresh token", 500, false);
        }
        const { accessToken, refreshToken, accessTokenExp, refreshTokenExp } = tokens;

        // set cookies
        setTokensCookies(res, accessToken, refreshToken, accessTokenExp, refreshTokenExp);

        //send success response with tokens
        return sendResponse(res, "Login Successfully", 200, true,
            {
                user: { id: user._id, email: user.email, name: user.name, mobile: user.mobile },
                is_auth: true
            }
        )

    } catch (error) {
        // console.log(error);
        sendResponse(res, "Unable to Login please try again later", 500, false)
    }
}

// user logout
exports.userLogout = async (req, res) => {
    try {
        // Remove refresh token from DB if user is authenticated
        if (req.user && req.user.id) {
            await userRefreshTokenModel.deleteMany({ userId: req.user.id });
        } else if (req.body && req.body.userId) {
            await userRefreshTokenModel.deleteMany({ userId: req.body.userId });
        }
        res.clearCookie('accessToken', { httpOnly: true, sameSite: 'strict' });
        res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
        res.clearCookie('is_auth', { sameSite: 'strict' });
        return sendResponse(res, "Logout successful", 200, true);
    } catch (error) {
        // console.log(error);
        return sendResponse(res, "Unable to Logout please try again later", 500, false);
    }
}

// change password
exports.userChangePassword = async (req, res) => {
    try {
        // console.log("Change password request body:", req.body);
        // console.log("Authenticated user ID:", req.user?._id);

        const { password } = req.body;

        // if (password !== password_confirmation) {
        //     return sendResponse(res, "New Password and Confirm New Password don't match");
        // }

        const salt = await bcrypt.genSalt(Number(process.env.SALT || 10));
        const newHashedPassword = await bcrypt.hash(password, salt);

        await UserModel.findByIdAndUpdate(req.user._id, {
            $set: {
                password: newHashedPassword,
            },
        });

        return sendResponse(res, "Password changed successfully", 200, true);
    } catch (error) {
        console.error("Error in userChangePassword:", error);
        return sendResponse(res, "Unable to Change Password please try again later", 500, false);
    }
};

// forget password
exports.userForgotPasswordOtpSender = async (req, res) => {
    // console.log("forgotPasswordOtpSender",req.body)
    try {
        const { email } = req.body;

        const user = await UserModel.findOne({ email });
        if (!user) {
            return sendResponse(res, "User not found", 404, false);
        }

        const { otp, otpExpiresAt } = generateOtp(10);

        await tempUser.findOneAndUpdate(
            { email },
            { otp, otpExpiresAt },
            { upsert: true, new: true }
        );

        console.log(`OTP for ${email}: ${otp} ${user.name}`);

        sendEmailFun({
            to: email,
            subject: "Forgot Password OTP",
            text: "test",
            html: VerificationEmail(user.name, otp),
        });

        return sendResponse(res, "OTP sent successfully", 200, true);
    } catch (error) {
        console.error("Forgot Password Error:", error);
        return sendResponse(res, "Internal server error", 500, false);
    }
};

//verify forget password
exports.userVerifyForgotPasswordOtp = async (req, res) => {
    try {
        const { email, otp, newPassword, confirmPassword } = req.body;

        const checkTempUser = await tempUser.findOne({ email });
        if (!checkTempUser || checkTempUser.otp !== otp || checkTempUser.otpExpiresAt < new Date()) {
            return sendResponse(res, "Invalid or expired OTP", 400, false);
        }

        if (newPassword !== confirmPassword) {
            return sendResponse(res, "New password and confirm password do not match", 400, false);
        }

        const user = await UserModel.findOne({ email });
        if (!user) {
            return sendResponse(res, "User not found", 404, false);
        }

        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        await tempUser.deleteOne({ email });

        return sendResponse(res, "Password updated successfully", 200, true);
    } catch (error) {
        console.error("Verify Forgot Password OTP Error:", error);
        return sendResponse(res, "Internal server error", 500, false);
    }
};

//google login 
exports.googleLogin = async (req, res) => {
    const { idToken } = req.body;
    // console.log("Received ID Token:", idToken?.substring(0, 50) + "...");
    if (!idToken) {
        // console.log("No token provided");
        return sendResponse(res, "idToken is required", 400, false);
    }

    try {
        // Verify Google ID token
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        // console.log("Token verified. Payload:", payload);
        const userInfo = {
            name: payload.name,
            email: payload.email,
            googleId: payload.sub,
        };

        // Check if user exists
        let user = await UserModel.findOne({ email: userInfo.email });

        // If not, create user with no password (Google login only)
        if (!user) {
            user = await UserModel.create({
                name: userInfo.name,
                email: userInfo.email,
                password: null,
                isVerified: true,
                googleId: userInfo.googleId,
            });
            // console.log("New user created in DB:", user);
        }

        // Generate tokens
        const tokens = await generateTokens(user);
        const { accessToken, refreshToken, accessTokenExp, refreshTokenExp } = tokens;

        // Set cookies
        setTokensCookies(res, accessToken, refreshToken, accessTokenExp, refreshTokenExp);

        return sendResponse(res, "Google login successful", 200, true, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                roles: user.role[0],
            },
            access_token: accessToken,
            refresh_token: refreshToken,
            access_token_exp: accessTokenExp,
            is_auth: true,
        });

    } catch (error) {
        console.error("Google login error:", error.message);
        return sendResponse(res, "Invalid or expired Google token", 401, false);
    }
};

//userprofile
exports.userProfile = async (req, res) => {
    res.send({ "user": req.user })
}