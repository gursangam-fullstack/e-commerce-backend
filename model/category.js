const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  images: [String], // Store multiple image paths
});

module.exports = mongoose.model("Category", categorySchema);