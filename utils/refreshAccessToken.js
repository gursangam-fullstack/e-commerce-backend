const { verifyRefreshToken } = require("../utils/verifyRefreshToken.js")
const userRefreshTokenModel = require("../model/userRefreshToken.js");
const UserModel = require("../model/User.js");
const { generateTokens } = require("./generateTokens.js");
const sendResponse = require("./sendResponse.js");

exports.refreshAccessToken = async (req) => {
    try {
        // Use the correct cookie name (case-sensitive)
        const oldRefreshToken = req.cookies?.refreshToken;
        console.log('refreshAccessToken: received refreshToken from cookie:', oldRefreshToken);

        if (!oldRefreshToken) {
            return sendResponse("Refresh token missing", 401, false);
        }

        //verify refresh token is valid or not 
        const { tokenDetails, error } = await verifyRefreshToken(oldRefreshToken);
        if (error || !tokenDetails) {
            console.warn('refreshAccessToken: verifyRefreshToken failed', { error, tokenDetails });
            return sendResponse("Invalid or expired refresh token", 401, false)
        }

        // Find user
        const user = await UserModel.findById(tokenDetails._id);
        if (!user) {
            return sendResponse("Invalid user", 404, false)
        }
        console.log('refreshAccessToken: user for generateTokens:', user);

        // Find refresh token in DB
        const userRefreshToken = await userRefreshTokenModel.findOne({
            userId: tokenDetails._id,
        });
        console.log('refreshAccessToken: userRefreshToken in DB:', userRefreshToken);

        if (
            !userRefreshToken ||
            oldRefreshToken !== userRefreshToken.token ||
            userRefreshToken.blacklisted
        ) {
            return sendResponse("Unauthorized access", 401, false) // FIXED: removed res parameter
        }

        // Generate new tokens
        const {
            accessToken,
            accessTokenExp,
            refreshToken,
            refreshTokenExp,
        } = await generateTokens(user);

        // FIXED: Update the refresh token in database
        await userRefreshTokenModel.findOneAndUpdate(
            { userId: tokenDetails._id },
            { 
                token: refreshToken,
                expiresAt: new Date(refreshTokenExp * 1000), // Convert to Date if needed
                blacklisted: false
            }
        );

        return {
            error: false,
            newAccessToken: accessToken,
            newAccessTokenExp: accessTokenExp,
            newRefreshToken: refreshToken,
            newRefreshTokenExp: refreshTokenExp,
        };
    } catch (err) {
        console.error("refreshAccessToken error:", err);
        return { error: true, message: "Internal Server Error" };
    }
};