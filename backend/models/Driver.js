const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  name: { type: String, required: true }, // Full name (lastName + firstName)
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  otp: { type: String },
  otpExpiry: { type: Date },
  status: { type: String, enum: ['active', 'blocked', 'pending', 'inactive'], default: 'pending' },
  isOnline: { type: Boolean, default: false },
  role: { type: String, enum: ['taxi', 'tow', 'delivery'], default: 'taxi' },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  vehicleType: { type: String, default: 'Tow' },
  profilePhoto: { type: String },
  vehicle: {
    model: String,
    year: String,
    plateNumber: String,
    color: String,
    photoUrl: String
  },
  documents: {
    license: {
      url: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectionReason: String
    },
    vehicleRegistration: {
      url: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectionReason: String
    },
    insurance: {
      url: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectionReason: String
    },
    isVerified: { type: Boolean, default: false }
  },
  settings: {
    requestSound: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true }
  },
  pushToken: { type: String }, // OneSignal Player ID
  rating: { type: Number, default: 5.0 },
  ratingCount: { type: Number, default: 0 },
  earnings: {
    daily: { type: Number, default: 0 },
    weekly: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  wallet: {
    balance: { type: Number, default: 0 },
    transactions: [{
      type: { type: String, enum: ['credit', 'debit'] },
      amount: Number,
      description: String,
      date: { type: Date, default: Date.now }
    }]
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Driver', DriverSchema);
