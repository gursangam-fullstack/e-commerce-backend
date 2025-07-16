const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // optional, add if every address must belong to a user
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minLength: [2, "First name must be at least 2 characters"],
      maxLength: [50, "First name must be less than 50 characters"],
      validate: {
        validator: function (v) {
          return /^[A-Za-z\s'-]+$/.test(v);
        },
        message: "First name must not contain numbers or special characters",
      },
    },
    lastName: {
      type: String,
      trim: true,
      maxLength: [50, "Last name must be less than 50 characters"],
      validate: {
        validator: function (v) {
          return /^[A-Za-z\s'-]*$/.test(v);
        },
        message: "Last name must not contain numbers or special characters",
      },
    },
    mobileNo: {
      type: String,
      required: [true, "Mobile number is required"],
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"],
    },
    alternativeMobileNo: {
      type: String,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit alternative mobile number"],
    },
    flatNo: {
      type: String,
      required: [true, "Flat number is required"],
      trim: true,
    },
    area: {
      type: String,
      required: [true, "Area is required"],
      trim: true,
    },
    landMark: {
      type: String,
      trim: true,
      maxLength: [100, "Landmark must be under 100 characters"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    zip: {
      type: String,
      required: [true, "ZIP code is required"],
      match: [/^\d{5,6}$/, "ZIP must be 5 or 6 digits"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
      default: "India",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Address", addressSchema);
