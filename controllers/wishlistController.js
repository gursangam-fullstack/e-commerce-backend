const Wishlist = require('../model/wishlist');
const Product = require('../model/product');
const userModel = require("../model/User");
const sendResponse = require('../utils/sendResponse');
const getPagination = require ('../utils/pagination')

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const { productId, userId } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return sendResponse(res, "Product not found", 404, false);
        }

        let wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            wishlist = new Wishlist({
                user: userId,
                products: [{ product: productId }]
            });
            await wishlist.save();

            await User.findByIdAndUpdate(
                userId,
                { $addToSet: { wishlist: wishlist._id } }
            );
        } else {
            const productExists = wishlist.products.some(
                item => item.product.toString() === productId
            );

            if (productExists) {
                return sendResponse(res, "Product already in wishlist", 400, false);
            }

            wishlist.products.push({ product: productId });
            await wishlist.save();
        }

        return sendResponse(res, "Product added to wishlist successfully", 200, true, {
            data: wishlist
        });
    } catch (error) {
        return sendResponse(res, "Error adding product to wishlist", 500, false);
    }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId, userId } = req.params;

        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            return sendResponse(res, "Wishlist not found", 404, false);
        }

        wishlist.products = wishlist.products.filter(
            item => item.product.toString() !== productId
        );

        await wishlist.save();

        if (wishlist.products.length === 0) {
            await User.findByIdAndUpdate(userId, {
                $pull: { wishlist: { $in: [wishlist._id] } }
            });

            await Wishlist.findByIdAndDelete(wishlist._id);

            return sendResponse(res, "Product removed and wishlist cleared", 200, true, { data: null });
        }

        return sendResponse(res, "Product removed from wishlist successfully", 200, true, {
            data: wishlist
        });
    } catch (error) {
        return sendResponse(res, "Error removing product from wishlist", 500, false);
    }
};

// Get user's wishlist
exports.getWishlist = async (req, res) => {
    try {
        const { userId } = req.params;
        // const page = parseInt(req.query.page) || 1;
        // const limit = parseInt(req.query.limit) || 12;
        // const skip = (page - 1) * limit;

               const { page, limit, skip } = getPagination(req.query);

        const wishlist = await Wishlist.findOne({ user: userId })
            .populate({
                path: 'products.product',
                select: 'name slug price discountedPrice images color variants',
                populate: [
                    { path: 'categories', select: 'name slug' },
                    { path: 'subCategories', select: 'name slug' },
                    { path: 'subSubCategories', select: 'name slug' }
                ]
            });

        if (!wishlist) {
            return sendResponse(res, "Wishlist not found", 404, false);
        }

        const formattedProducts = wishlist.products.map(item => {
            const product = item.product;
            const imageUrls = product.images || [];

            return {
                id: product._id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                discountedPrice: product.discountedPrice,
                color: product.color,
                variants: product.variants,
                images: imageUrls,
                categories: product.categories,
                subCategories: product.subCategories,
                subSubCategories: product.subSubCategories,
                addedAt: item.addedAt
            };
        });

        const total = formattedProducts.length;
        const paginatedProducts = formattedProducts.slice(skip, skip + limit);

        return sendResponse(res, "Wishlist retrieved successfully", 200, true, {
            data: paginatedProducts,
            total,
            page,
            limit
        });
    } catch (error) {
        return sendResponse(res, "Error fetching wishlist", 500, false);
    }
};

// Check if product is in wishlist
exports.checkWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            return sendResponse(res, "Product not in wishlist", 200, true, {
                isInWishlist: false
            });
        }

        const isInWishlist = wishlist.products.some(
            item => item.product.toString() === productId
        );

        return sendResponse(res, "Wishlist status checked successfully", 200, true, {
            isInWishlist
        });
    } catch (error) {
        return sendResponse(res, "Error checking wishlist status", 500, false);
    }
};
