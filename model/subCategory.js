const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String },
  images: [{ type: String, required: true }],
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
}, { timestamps: true });

subCategorySchema.index({ slug: 1, parentCategory: 1 }, { unique: true });

module.exports = mongoose.model('SubCategory', subCategorySchema);