const { set } = require("mongoose");
const { isTokenExpire } = require("../utils/isTokenExpired");
const { refreshAccessToken } = require("../utils/refreshAccessToken");
const sendResponse = require("../utils/sendResponse");
const { setTokensCookies } = require("../utils/setTokensCookies");

exports.accessTokenAutoRefresh = async (req, res, next) => {
    try {
        let accessToken = req.cookies.accessToken;
        const refreshToken = req.cookies.refreshToken;

        // If no tokens at all, let the route handler decide what to do
        if (!accessToken && !refreshToken) {
            return next();
        }

        // Check if access token exists and is valid
        if (accessToken && !isTokenExpire(accessToken)) {
            req.headers['authorization'] = `Bearer ${accessToken}`;
            return next();
        }

        // Access token expired/missing, try refresh
        if (!refreshToken) {
            // Clear invalid cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return next(); // Let route handler handle unauthorized state
        }

        const result = await refreshAccessToken(req);
        
        if (result.error) {
            // Clear invalid cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return next(); // Let route handler handle unauthorized state
        }

        const { newAccessToken, newAccessTokenExp, newRefreshToken, newRefreshTokenExp } = result;

        setTokensCookies(res, newAccessToken, newRefreshToken, newAccessTokenExp, newRefreshTokenExp);
        req.headers['authorization'] = `Bearer ${newAccessToken}`;
        req.cookies.accessToken = newAccessToken;
        req.cookies.refreshToken = newRefreshToken;

        next();
    } catch (error) {
        console.error("Error in accessTokenAutoRefresh:", error);
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        next(); // Continue to route handler
    }
};