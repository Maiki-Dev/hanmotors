const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, default: 'Customer' },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  otp: { type: String },
  otpExpiry: { type: Date },
  pushToken: { type: String },
  rating: { type: Number, default: 5.0 },
  wallet: { type: Number, default: 0 },
  transactions: [{
    type: { type: String, enum: ['credit', 'debit'] },
    amount: Number,
    description: String,
    date: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', CustomerSchema);
