const express = require('express');
const passport = require('passport');
const authorizeRole = require('../middlewares/authorizeRole');
const { accessTokenAutoRefresh } = require('../middlewares/accessTokenAutoRefresh');
const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkWishlist
} = require('../controllers/wishlistController');

const wishlistRouter = express.Router();

// ✅ Route to add a product to wishlist
wishlistRouter.post(
  "/wishlist/add/:userId/:productId",
  accessTokenAutoRefresh,
  passport.authenticate('jwt', { session: false }),
  authorizeRole('admin'),
  addToWishlist
);

// ✅ Route to remove a product from wishlist
wishlistRouter.delete(
  "/remove/:productId/:userId",
  accessTokenAutoRefresh,
  passport.authenticate('jwt', { session: false }),
  authorizeRole('admin'),
  removeFromWishlist
);

// ✅ Route to get user's wishlist
wishlistRouter.get(
  "/get-wishlist/:userId",
  accessTokenAutoRefresh,
  passport.authenticate('jwt', { session: false }),
  authorizeRole('admin'),
  getWishlist
);

// ✅ Route to check if a product is in the wishlist
wishlistRouter.get(
  "/check/:productId",
  accessTokenAutoRefresh,
  passport.authenticate('jwt', { session: false }),
  authorizeRole('admin'),
  checkWishlist
);

module.exports = wishlistRouter;
