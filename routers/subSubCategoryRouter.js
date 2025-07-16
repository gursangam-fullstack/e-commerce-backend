const express = require('express');
const passport = require('passport');
const upload = require("../middlewares/multer");
const { createSubSubCategorySchema, updateSubSubCategorySchema } = require('../validations/subSubCategoryValidation');
const { createSubSubCategory, updateSubSubCategory, deleteSubSubCategory, deleteAllSubSubCategory, getSubSubCategoryById, getAllSubSubCategories, getSubSubCategoriesBySubCategory, getSubSubCategoriesByCategoryName, getSubSubCategoryWithRelatedData } = require('../controllers/subSubCategoryController');
const { accessTokenAutoRefresh } = require('../middlewares/accessTokenAutoRefresh');
const authorizeRole = require('../middlewares/authorizeRole');
const validate = require('../middlewares/validate');

const subSubCategoryRouter = express.Router();


// Public Router
subSubCategoryRouter.get("/get-sub-subcategory/:id", getSubSubCategoryById);
subSubCategoryRouter.get("/all-sub-subcategories", getAllSubSubCategories);
subSubCategoryRouter.get("/by-subcategory/:subCategoryId", getSubSubCategoriesBySubCategory);
subSubCategoryRouter.get("/by-category/:categoryName", getSubSubCategoriesByCategoryName);
subSubCategoryRouter.get("/subsubcategory-related-data/:categorySlug/:subCategorySlug/:subSubCategorySlug", getSubSubCategoryWithRelatedData);


// Private Router
subSubCategoryRouter.post("/create-sub-subCategory", upload.array("images", 1), upload.compressImages, accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), validate(createSubSubCategorySchema), createSubSubCategory)

subSubCategoryRouter.put("/update-sub-subCategory/:id", upload.array("images", 1), upload.compressImages, accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), validate(updateSubSubCategorySchema), updateSubSubCategory)

subSubCategoryRouter.delete("/delete-sub-subcategory/:id", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deleteSubSubCategory)

subSubCategoryRouter.delete("/delete-sub-sub-category/delete-all", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deleteAllSubSubCategory)


module.exports = subSubCategoryRouter;