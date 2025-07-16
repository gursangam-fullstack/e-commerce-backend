const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: false
  },

  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    size: {
      type: String,
      required: true
    }
  }],

  address: {
    firstName: String,
    lastName: String,
    mobileNo: String,
    alternativeMobileNo: String,
    flatNo: String,
    area: String,
    landMark: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },

  paymentMethod: {
    type: String,
    enum: ['cod', 'online'],
    required: true,
    default: 'cod'
  },

  razorpayOrderId: {
    type: String,
    unique: true,
    sparse: true
  },

  paymentId: {
    type: String,
    unique: true,
    sparse: true
  },

  amount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },

  source: {
    type: String,
    enum: ['frontend', 'webhook', 'both'],
    default: 'frontend'
  },

  codStatus: {
    type: String,
    enum: ['not_collected', 'collected'],
    default: 'not_collected'
  },

  shippingStatus: {
    type: String,
    enum: ['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'processing'
  },

  shippingTimestamps: {
    processing: { type: Date, default: Date.now },
    shipped: Date,
    out_for_delivery: Date,
    delivered: Date,
    cancelled: Date,
    returned: Date
  },

  cancelReason: {
    type: String,
    default: ''
  },

  cancelledAt: { type: Date },

  returns: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    size: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reason: {
      type: String
    },
    returnStatus: {
      type: String,
      enum: ['requested', 'pickup_scheduled', 'picked_up', 'returned_to_warehouse', 'rejected'],
      default: 'requested'
    },
    returnTimestamps: {
      requested: { type: Date, default: Date.now },
      pickup_scheduled: Date,
      picked_up: Date,
      returned_to_warehouse: Date,
      rejected: Date
    },
    pickupAgent: {
      name: String,
      contact: String,
      trackingId: String
    },
    returnVerified: {
      type: Boolean,
      default: false
    }
  }],

  refundStatus: {
    type: String,
    enum: ['not_applicable', 'refund_applied', 'refund_processing', 'refund_completed', 'refund_failed'],
    default: 'not_applicable'
  },

  refundTimestamps: {
    refund_applied: Date,
    refund_processing: Date,
    refund_completed: Date,
    refund_failed: Date
  },

  refundId: {
    type: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
