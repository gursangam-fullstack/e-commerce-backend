const express = require('express');
const passport = require('passport');
const authorizeRole = require('../middlewares/authorizeRole');
const { accessTokenAutoRefresh } = require('../middlewares/accessTokenAutoRefresh');
const { createReview, updateReview, deleteReview, getUserReviews } = require('../controllers/reviewController');

const reviewRouter = express.Router();

// Public Router
reviewRouter.get("/reviews/user", getUserReviews)


// Private Router

reviewRouter.post("/add-reviews/:userId", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), createReview)

reviewRouter.put("/reviews/:reviewId", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), updateReview)

reviewRouter.delete("/reviews/:reviewId", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deleteReview)

module.exports = reviewRouter;