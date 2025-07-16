const express = require('express');
const passport = require('passport');
const authorizeRole = require('../middlewares/authorizeRole');
const { accessTokenAutoRefresh } = require('../middlewares/accessTokenAutoRefresh');
const { createAddressController, getAddressById, updateAddress, deleteAddress } = require("../controllers/addressController")

const addressRouter = express.Router();

// Public Router



// Private Router

addressRouter.post("/add-address", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), createAddressController)

addressRouter.get("/get-address/:userId", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), getAddressById)

addressRouter.put("/update-address/:id", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), updateAddress)

addressRouter.delete("/delete-address/:id", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), deleteAddress)

module.exports = addressRouter;