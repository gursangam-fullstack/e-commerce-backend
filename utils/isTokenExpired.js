const jwt = require('jsonwebtoken')

exports.isTokenExpire = (token) => {
    try {
        if (!token) {
            console.log('isTokenExpire: token is null/undefined');
            return true;
        }

        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            console.log('isTokenExpire: token has no expiration');
            return true;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = decoded.exp < currentTime;
        
        console.log('isTokenExpire: token exp:', decoded.exp, 'current time:', currentTime, 'expired:', isExpired);
        
        return isExpired;
    } catch (error) {
        console.error('isTokenExpire error:', error);
        return true;
    }
};


