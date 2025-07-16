const mongoose = require('mongoose');

const tempUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  mobile: String,
  passwordHash: String,
  otp: String,
  otpExpiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

tempUserSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('TempUser', tempUserSchema);
