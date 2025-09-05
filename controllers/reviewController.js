const Review = require('../model/review');
const Product = require('../model/product');
const sendResponse = require("../utils/sendResponse");
//const getPagination = require ("../utils/pagination")

// Add review
exports.createReview = async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;
        const { userId } = req.params; // Get from auth middleware

        // Validate if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return sendResponse(res, "Product not found", 404, false);
        }

        // Check if already reviewed
        const alreadyReviewed = await Review.findOne({ product: productId, user: userId });
        if (alreadyReviewed) {
            return sendResponse(res, "Product already reviewed", 400, false);
        }

        // Create review
        const review = await Review.create({
            product: productId,
            user: userId,
            rating,
            comment
        });

        // Populate user info for response
        await review.populate('user', 'name');

        // Update Product Stats
        const reviews = await Review.find({ product: productId });
        const averageRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;

        await Product.findByIdAndUpdate(productId, {
            averageRating: Number(averageRating.toFixed(1)),
            numReviews: reviews.length
        });

        return sendResponse(res, "Review created successfully", 201, true, {
            data: review
        });
    } catch (error) {
        // console.error('Create Review Error:', error);
        return sendResponse(res, "Error creating review", 500, false);
    }
};

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Validate if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return sendResponse(res, "Product not found", 404, false);
        }

        // Get total count for pagination
        const total = await Review.countDocuments({ product: productId });

        // Get reviews with pagination
        const reviews = await Review.find({ product: productId })
            .populate('user', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return sendResponse(res, "Reviews retrieved successfully", 200, true, {
            data: {
                product: {
                    _id: product._id,
                    name: product.name
                },
                reviews,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        // console.error('Get Product Reviews Error:', error);
        return sendResponse(res, "Error fetching reviews", 500, false);
    }
};

// Update review
exports.updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        // Find review and check ownership
        const review = await Review.findById(reviewId);
        if (!review) {
            return sendResponse(res, "Review not found", 404, false);
        }

        if (review.user.toString() !== userId.toString()) {
            return sendResponse(res, "Not authorized to update this review", 403, false);
        }

        // Update review
        const updatedReview = await Review.findByIdAndUpdate(
            reviewId,
            { rating, comment },
            { new: true }
        ).populate('user', 'name');

        // Update Product Stats
        const reviews = await Review.find({ product: review.product });
        const averageRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;

        await Product.findByIdAndUpdate(review.product, {
            averageRating: Number(averageRating.toFixed(1)),
            numReviews: reviews.length
        });

        return sendResponse(res, "Review updated successfully", 200, true, {
            data: updatedReview
        });
    } catch (error) {
        // console.error('Update Review Error:', error);
        return sendResponse(res, "Error updating review", 500, false);
    }
};

// Delete review
exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;

        // Find review and check ownership
        const review = await Review.findById(reviewId);
        if (!review) {
            return sendResponse(res, "Review not found", 404, false);
        }

        if (review.user.toString() !== userId.toString()) {
            return sendResponse(res, "Not authorized to delete this review", 403, false);
        }

        // Delete review
        await Review.findByIdAndDelete(reviewId);

        // Update Product Stats
        const reviews = await Review.find({ product: review.product });
        const averageRating = reviews.length > 0
            ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
            : 0;

        await Product.findByIdAndUpdate(review.product, {
            averageRating: Number(averageRating.toFixed(1)),
            numReviews: reviews.length
        });

        return sendResponse(res, "Review deleted successfully", 200, true);
    } catch (error) {
        // console.error('Delete Review Error:', error);
        return sendResponse(res, "Error deleting review", 500, false);
    }
};

// Get user's reviews
exports.getUserReviews = async (req, res) => {
    try {
        const userId = req.user._id; // Get from auth middleware
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
//const { page, limit, skip } = getPagination(req.query);

   
        // Get total count for pagination
        const total = await Review.countDocuments({ user: userId });

        // Get user's reviews with pagination
        const reviews = await Review.find({ user: userId })
            .populate('product', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return sendResponse(res, "User reviews retrieved successfully", 200, true, {
            data: reviews,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
         console.error('Get User Reviews Error:', error);
        return sendResponse(res, "Error fetching user reviews", 500, false);
    }
};

// Get detailed product reviews with product info
exports.getProductReviewDetails = async (req, res) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Validate if product exists and get product details
        const product = await Product.findById(productId)
            .populate("categories", "name slug")
            .populate("subCategories", "name slug")
            .populate("subSubCategories", "name slug")
            .lean();

        if (!product) {
            return sendResponse(res, "Product not found", 404, false);
        }

        // Get total count for pagination
        const total = await Review.countDocuments({ product: productId });

        // Get reviews with pagination
        const reviews = await Review.find({ product: productId })
            .populate('user', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Calculate rating statistics
        const ratingStats = await Review.aggregate([
            { $match: { product: product._id } },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: "$rating" },
                    ratingDistribution: {
                        $push: "$rating"
                    }
                }
            }
        ]);

        let stats = {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };

        if (ratingStats.length > 0) {
            const ratingData = ratingStats[0];
            stats.totalReviews = ratingData.totalReviews;
            stats.averageRating = Number(ratingData.averageRating.toFixed(1));

            // Calculate rating distribution
            ratingData.ratingDistribution.forEach(rating => {
                stats.ratingDistribution[rating]++;
            });
        }

        return sendResponse(res, "Product review details retrieved successfully", 200, true, {
            data: {
                product: {
                    _id: product._id,
                    name: product.name
                },
                reviews,
                stats,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        // console.error('Get Product Review Details Error:', error);
        return sendResponse(res, "Error fetching product review details", 500, false);
    }
};

// Get reviews for a specific product with filtering and pagination
exports.getProductReviewsByProductId = async (req, res) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const rating = req.query.rating ? parseInt(req.query.rating) : null;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;

        // Validate if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return sendResponse(res, "Product not found", 404, false);
        }

        // Build filter
        const filter = { product: productId };
        if (rating && rating >= 1 && rating <= 5) {
            filter.rating = rating;
        }

        // Get total count for pagination
        const total = await Review.countDocuments(filter);

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder;

        // Get reviews with pagination and sorting
        const reviews = await Review.find(filter)
            .populate('user', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        // Calculate rating statistics
        const ratingStats = await Review.aggregate([
            { $match: { product: product._id } },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: "$rating" },
                    ratingDistribution: {
                        $push: "$rating"
                    }
                }
            }
        ]);

        let stats = {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };

        if (ratingStats.length > 0) {
            const ratingData = ratingStats[0];
            stats.totalReviews = ratingData.totalReviews;
            stats.averageRating = Number(ratingData.averageRating.toFixed(1));

            // Calculate rating distribution
            ratingData.ratingDistribution.forEach(rating => {
                stats.ratingDistribution[rating]++;
            });
        }

        return sendResponse(res, "Product reviews retrieved successfully", 200, true, {
            data: {
                product: {
                    _id: product._id,
                    name: product.name
                },
                reviews,
                stats,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
                filters: {
                    rating: rating || null,
                    sortBy,
                    sortOrder: sortOrder === 1 ? 'asc' : 'desc'
                }
            }
        });
    } catch (error) {
        // console.error('Get Product Reviews By Product ID Error:', error);
        return sendResponse(res, "Error fetching product reviews", 500, false);
    }
};
