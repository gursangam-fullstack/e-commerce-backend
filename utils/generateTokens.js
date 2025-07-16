const jwt = require('jsonwebtoken');
const userRefreshTokenModel = require('../model/userRefreshToken');

exports.generateTokens = async (user) => {
    try {
        const playload = { _id: user._id, roles: user.roles };

        // generate access token with expiration time
        const accessTokenExp = Math.floor(Date.now() / 1000) + 100;
        // expiration to 100 seconds from now 
        const accessToken = jwt.sign(
            { ...playload, exp: accessTokenExp },
            process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
            // {expiresIn: '100s'}
        );

        // genrerate refresh token with expiration time
        const refreshTokenExp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 5 //set expiration to 5 days from now 

        const refreshToken = jwt.sign(
            { ...playload, exp: refreshTokenExp },
            process.env.JWT_REFRESH_TOKEN_SECRET_KEY,
            // {expiresIn: '5d'}
        )

        //check the refresh token and remove the previous if found 
    
        await userRefreshTokenModel.findOneAndDelete({ userId: user._id })

        //save new refresh token 
        await new userRefreshTokenModel({ userId: user._id, token: refreshToken }).save();

        // Return the tokens and expiration times as an object
        return {
            accessToken,
            refreshToken,
            accessTokenExp,
            refreshTokenExp
        };

    } catch (error) {
        console.error('generateTokens error:', error, 'user:', user);
        throw new Error("Unable to create access or refresh token");
    }
}

