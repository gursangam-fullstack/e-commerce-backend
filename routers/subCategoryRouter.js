const express = require('express');
const passport = require('passport');
const upload = require("../middlewares/multer");
const { accessTokenAutoRefresh } = require('../middlewares/accessTokenAutoRefresh');
const authorizeRole = require('../middlewares/authorizeRole');
const validate = require('../middlewares/validate');
const { createSubCategorySchema, updateSubCategorySchema } = require('../validations/subCategoryValidation');
const { createSubCategory, updateSubCategory, deletesubCategory, deleteAllSubCategory, getAllSubCategories, getSubCategoryById, getSubCategoriesByCategory, getSubCategoryWithRelatedData } = require('../controllers/subCategoryController');

const subCategoryRouter = express.Router();


// Public Router
subCategoryRouter.get('/all-subcategories', getAllSubCategories);
subCategoryRouter.get('/getsubcategory/:id', getSubCategoryById);
subCategoryRouter.get('/by-category/:categoryId', getSubCategoriesByCategory);
subCategoryRouter.get("/subcategory-related-data/:categorySlug/:subCategorySlug", getSubCategoryWithRelatedData);

// Private Router

subCategoryRouter.post("/create-subcategory", upload.array("images", 1), upload.compressImages, accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), validate(createSubCategorySchema), createSubCategory)

subCategoryRouter.put("/update-subcategory/:id", upload.array("images", 1), upload.compressImages, accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), validate(updateSubCategorySchema), updateSubCategory)

subCategoryRouter.delete("/delete-subcategory/:id", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deletesubCategory)

subCategoryRouter.delete("/delete-all", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deleteAllSubCategory)

module.exports = subCategoryRouter;