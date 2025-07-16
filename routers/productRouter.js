const express = require('express');
const passport = require('passport');
const upload = require("../middlewares/multer");
const authorizeRole = require('../middlewares/authorizeRole');
const validate = require('../middlewares/validate');
const { accessTokenAutoRefresh } = require('../middlewares/accessTokenAutoRefresh');
const { productSchema } = require('../validations/productValidation');
const { createProduct, updateProduct, deleteProduct, deleteAllProducts, getAllProducts, getProductsByFilters, getAllProductColorsAndSizes, getProductById, getProductDetailsWithReviews, getAllProductColorsAndSizesBySearch, getRelatedProducts } = require('../controllers/productController');

const productRouter = express.Router();


// Public Router
productRouter.get('/products', getAllProducts);
productRouter.get('/products/filters', getProductsByFilters);
productRouter.get('/products/colors-sizes', getAllProductColorsAndSizes);
productRouter.get('/products/:id', getProductById);
productRouter.get('/products/details/:productId', getProductDetailsWithReviews);
productRouter.get('/get-by-search', getAllProductColorsAndSizesBySearch);
productRouter.get('/products/related/:slug', getRelatedProducts);

// Private Router
productRouter.post("/create-product", upload.array("images", 8), upload.compressImages, accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), validate(productSchema), createProduct)

productRouter.put("/products/:id", upload.array("images", 8), upload.compressImages, accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), validate(productSchema), updateProduct)

productRouter.delete("/products-delete/:id", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deleteProduct)

productRouter.delete("/products/delete-all", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deleteAllProducts)

module.exports = productRouter;