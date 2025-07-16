const jwt = require("jsonwebtoken");
const userRefreshTokenModel = require("../model/userRefreshToken");

exports.verifyRefreshToken = async (refreshToken) => {
    try {
        if (!refreshToken) {
            return { error: true, message: "Refresh token is required" };
        }

        const privateKey = process.env.JWT_REFRESH_TOKEN_SECRET_KEY;

        //find the refresh token document
        const userRefreshToken = await userRefreshTokenModel.findOne({
            token: refreshToken
        });

        //if refresh token not found or blacklisted, return error
        if (!userRefreshToken || userRefreshToken.blacklisted) {
            return { error: true, message: "Refresh token not found or blacklisted" };
        }

        // verify the refresh token
        const tokenDetails = jwt.verify(refreshToken, privateKey);
        
        //if verification successful, return token details
        return {
            tokenDetails,
            error: false,
            message: "valid refresh token"
        }
    }
    catch (error) {
        console.error("JWT verification failed:", error.message);
        return { error: true, message: "Invalid refresh token" }; // FIXED: return instead of throw
    }
}