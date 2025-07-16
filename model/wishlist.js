const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Create compound index to ensure a user can't add the same product twice
wishlistSchema.index({ user: 1, 'products.product': 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema); 