const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, default: 'Customer' },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  otp: { type: String },
  otpExpiry: { type: Date },
  pushToken: { type: String },
  rating: { type: Number, default: 5.0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', CustomerSchema);
