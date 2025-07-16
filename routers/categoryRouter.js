const express = require('express');
const passport = require('passport');
const { accessTokenAutoRefresh } = require('../middlewares/accessTokenAutoRefresh');
const { createCategoryController, updateCategory, deleteCategory, deleteAllCategories, getAllCategories, getCategoryById, getCategoryWithAllRelatedData } = require('../controllers/categoryController');
const upload = require("../middlewares/multer");
const authorizeRole = require('../middlewares/authorizeRole');
const validate = require('../middlewares/validate');
const { createCategorySchema, updateCategorySchema } = require('../validations/categoryValidation');
const categoryRouter = express.Router();


// Public Router

categoryRouter.get("/all-categories", getAllCategories)
categoryRouter.get("/getcategory/:id", getCategoryById)
categoryRouter.get("/category-related-data/:categorySlug", getCategoryWithAllRelatedData)

// Protected Router
categoryRouter.post("/create-category", upload.array("images", 1), upload.compressImages, accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), validate(createCategorySchema), createCategoryController)

categoryRouter.put("/updatecategory/:id", upload.array("images", 1), upload.compressImages, accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), validate(updateCategorySchema), updateCategory)

categoryRouter.delete("/deletecategory/:id", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deleteCategory)

categoryRouter.delete("/delete-all", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deleteAllCategories)



module.exports = categoryRouter;