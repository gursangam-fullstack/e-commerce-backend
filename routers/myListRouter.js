const express = require('express');
const passport = require('passport');
const authorizeRole = require('../middlewares/authorizeRole');
const { addToMyListController, getMyListProductController, deleteMyListItemsController, updateCartQuantityController } = require("../controllers/myListController");
const { accessTokenAutoRefresh } = require('../middlewares/accessTokenAutoRefresh');
const myListRouter = express.Router();

// Public Router

myListRouter.get("/get-mylist-product/:userId", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), getMyListProductController)

// Private Router
myListRouter.post("/add-to-mylist", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), addToMyListController)

myListRouter.delete("/delete-mylist-product/:userId", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deleteMyListItemsController)

myListRouter.put("/update-quantity/:userId", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), updateCartQuantityController)

module.exports = myListRouter;
