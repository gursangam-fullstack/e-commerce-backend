const express = require("express");
const passport = require("passport");
const authorizeRole = require("../middlewares/authorizeRole");
const {
  accessTokenAutoRefresh,
} = require("../middlewares/accessTokenAutoRefresh");
const {
  createAddressController,
  getAddressById,
  updateAddress,
  deleteAddress,
} = require("../controllers/addressController");
const validate = require("../middlewares/validate");
const { addressSchema } = require("../validations/addressValidation");

const addressRouter = express.Router();

// Public Router

// Private Router

addressRouter.post(
  "/add-address",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizeRole("admin", "user"),
  validate(addressSchema),
  createAddressController
);

addressRouter.put(
  "/update-address/:id",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizeRole("admin", "user"),
  validate(addressSchema), 
  updateAddress
);

addressRouter.get(
  "/get-address",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizeRole("admin", "user"),
  getAddressById
);

addressRouter.delete(
  "/delete-address/:id",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizeRole("admin", "user"),
  deleteAddress
);

module.exports = addressRouter;
