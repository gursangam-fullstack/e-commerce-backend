const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Provide name"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Provide email"],
      trim: true,
      lowercase: true,
      unique: true,
    },

    password: {
      type: String,
      default: null,
    },

    googleId: {
      type: String,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    avatar: {
      type: String,
      default: "",
    },

    mobile: {
      type: String,
      default: null,
    },

    address_details: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "address",
      },
    ],

    shopping_cart: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CartProduct",
      },
    ],

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wishlist",
      },
    ],

    my_list: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MyList",
      },
    ],

    order_history: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
    },

    otp: {
      type: String,
      default: null,
    },

    otp_expires: {
      type: Date,
      default: null,
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);


const userModel = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = userModel;