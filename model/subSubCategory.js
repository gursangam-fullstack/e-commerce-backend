const mongoose = require("mongoose");

const subSubCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    images: [{ type: String, required: true }], // Array of image paths - required
    parentSubCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubSubCategory", subSubCategorySchema);
