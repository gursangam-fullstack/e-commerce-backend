const mongoose = require("mongoose");

const listSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  size: { type: String, required: true }, // or Number depending on your use-case
  quantity: { type: Number, default: 1 },
}, {
  timestamps: true,
});

listSchema.index({ userId: 1, productId: 1, size: 1 }, { unique: true });

module.exports = mongoose.model("MyList", listSchema);
