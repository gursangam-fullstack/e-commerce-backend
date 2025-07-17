// import UserModel from "../models/User.js";
// import { Strategy as JwtStrategy } from 'passport-jwt'; 
// import passport from "passport";

const UserModel = require("../model/User");
const { Strategy : JwtStrategy } = require('passport-jwt')
const passport = require('passport')

// ✅ Custom extractor to get JWT from cookies
const cookieExtractor = function(req) {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies.accessToken; // match the cookie name used in setTokensCookies
  }
  return token;
};

const opts = {
  jwtFromRequest: cookieExtractor, // ✅ get token from cookies instead of headers
  secretOrKey: process.env.JWT_ACCESS_TOKEN_SECRET_KEY
};

// ✅ Register the strategy
passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await UserModel.findById(jwt_payload._id).select('-password');
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);