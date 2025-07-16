const mongoose = require("mongoose");
const Address = require("../model/address");
const userModel = require("../model/user");
const sendResponse = require("../utils/sendResponse");

// Create address and link to user
exports.createAddressController = async (req, res) => {
  try {
    const {
      userId,
      firstName,
      lastName,
      mobileNo,
      alternativeMobileNo,
      flatNo,
      area,
      landMark,
      city,
      state,
      zip,
      country,
    } = req.body;

    if (!userId) {
      return sendResponse(res, "User ID is required", 400, false);
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return sendResponse(res, "User not found", 404, false);
    }

    const addressCount = await Address.countDocuments({ user: userId });
    if (addressCount >= 5) {
      return sendResponse(res, "You can only add up to 5 addresses", 400, false);
    }

    const existingAddress = await Address.findOne({
      user: userId,
      firstName,
      lastName,
      mobileNo,
      flatNo,
      area,
      landMark,
      city,
      state,
      zip,
      country,
    });

    if (existingAddress) {
      return sendResponse(res, "This address already exists in the database", 409, false);
    }

    // ✅ Create and save new address
    const address = new Address({
      user: userId,
      firstName,
      lastName,
      mobileNo,
      alternativeMobileNo,
      flatNo,
      area,
      landMark,
      city,
      state,
      zip,
      country,
    });

    await address.save();

    // ✅ Link address to user
    user.address_details.push(address._id);
    await user.save();

    return sendResponse(res, "Address saved and linked to user successfully", 201, true, {
      data: address
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const formattedErrors = {};
      for (let field in error.errors) {
        formattedErrors[field] = error.errors[field].message;
      }
      return sendResponse(res, "Validation failed", 400, false, {
        errors: formattedErrors
      });
    }

    // console.error("Error creating address:", error);
    return sendResponse(res, "Internal server error", 500, false);
  }
};

// Get address by id
exports.getAddressById = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendResponse(res, "Invalid user ID", 400, false);
    }

    // Fetch total count
    const totalItems = await Address.countDocuments({ user: userId });

    // Find all addresses linked to this user
    const addresses = await Address.find({ user: userId })
      .skip(skip)
      .limit(limit);

    if (!addresses || addresses.length === 0) {
      return sendResponse(res, "No addresses found for this user", 404, false);
    }

    return sendResponse(res, "Addresses retrieved successfully", 200, true, {
      data: addresses,
      total: totalItems,
      page,
      limit
    });
  } catch (error) {
    // console.error("Error fetching addresses by user ID:", error);
    return sendResponse(res, "Error fetching addresses", 500, false);
  }
};

// Update address
exports.updateAddress = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      mobileNo,
      alternativeMobileNo,
      flatNo,
      area,
      landMark,
      city,
      state,
      zip,
      country,
    } = req.body;
    const addressId = req.params.id;

    const existingAddress = await Address.findById(addressId);
    if (!existingAddress) {
      return sendResponse(res, "Address not found", 404, false);
    }

    const isSame =
      existingAddress.firstName === firstName &&
      existingAddress.lastName === lastName &&
      existingAddress.mobileNo === mobileNo &&
      existingAddress.alternativeMobileNo === alternativeMobileNo &&
      existingAddress.zip === zip &&
      existingAddress.city === city &&
      existingAddress.flatNo === flatNo &&
      existingAddress.area === area &&
      existingAddress.landMark === landMark &&
      existingAddress.state === state &&
      existingAddress.country === country;

    if (isSame) {
      return sendResponse(res, "No changes detected. Address is already up to date", 409, false);
    }

    const updated = await Address.findByIdAndUpdate(
      addressId,
      {
        firstName,
        lastName,
        mobileNo,
        alternativeMobileNo,
        flatNo,
        area,
        landMark,
        city,
        state,
        zip,
        country,
      },
      { new: true, runValidators: true }
    );

    return sendResponse(res, "Address updated successfully", 200, true, {
      data: updated
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const formattedErrors = {};
      for (let field in error.errors) {
        formattedErrors[field] = error.errors[field].message;
      }
      return sendResponse(res, "Validation failed", 400, false, {
        errors: formattedErrors
      });
    }
    return sendResponse(res, "Internal server error", 500, false);
  }
};

// Delete address
exports.deleteAddress = async (req, res) => {
  // console.log(req.params)
  try {
    // console.log(req.params.id)
    const deleted = await Address.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return sendResponse(res, "Address not found", 404, false);
    }

    // Optionally, remove reference from user.address_details here if needed

    return sendResponse(res, "Address deleted successfully", 200, true);
  } catch (error) {
    // console.error("Error deleting address:", error);
    return sendResponse(res, "Error deleting address", 500, false);
  }
};
