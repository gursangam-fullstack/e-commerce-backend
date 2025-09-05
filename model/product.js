const mongoose = require('mongoose');

// Variant Schema
const variantSchema = new mongoose.Schema({
  size: { type: String },
  stock: { type: Number, required: true },
});

// Key Highlights Schema
const keyHighlightsSchema = new mongoose.Schema({
  design: { type: String },
  fit: { type: String },
  waistRise: { type: String },
  distress: { type: String },
  occasion: { type: String },
  closure: { type: String },
  sleeveStyle: { type: String },
  washCare: { type: String },
}, { _id: false });

// Clothing Spec
const clothingSpecSchema = new mongoose.Schema({
  fabric: { type: String },
  fit: { type: String },
  neck: { type: String },
  sleeve: { type: String },
  pattern: { type: String },
  length: { type: String },
  hemline: { type: String },
  closureType: { type: String },
  stretchable: { type: Boolean },
  careInstructions: { type: String },
  transparency: { type: String },
}, { _id: false });

// Perfume Spec
const perfumeSpecSchema = new mongoose.Schema({
  fragranceType: { type: String },
  topNotes: { type: String },
  middleNotes: { type: String },
  baseNotes: { type: String },
  longevity: { type: String },
  sillage: { type: String },
  volume: { type: String },
  concentration: { type: String },
  shelfLife: { type: String },
  containerType: { type: String },
  packagingType: { type: String },
}, { _id: false });

// Jewelry Spec
const jewelrySpecSchema = new mongoose.Schema({
  material: { type: String },
  dimensions: { type: String },
  warranty: { type: String },
  finish: { type: String },
  stoneType: { type: String },
  baseMetal: { type: String },
}, { _id: false });

// Combined Specification Schema
const specificationSchema = new mongoose.Schema({
  clothing: { type: clothingSpecSchema },
  perfume: { type: perfumeSpecSchema },
  jewelry: { type: jewelrySpecSchema }
}, { _id: false });

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  weight: { type: String },
  discountedPrice: { type: Number },
  color: { type: String, required: true },
  gender: { type: String, required: true, enum: ['male', 'female', 'unisex'] ,
    //update
      default: 'unisex'
  },
  images: [String],
  variants: [variantSchema],
  keyHighlights: keyHighlightsSchema,
  specifications: { type: specificationSchema },
  categories: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  subCategories: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory' },
  subSubCategories: { type: mongoose.Schema.Types.ObjectId, ref: 'SubSubCategory' },
  averageRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
