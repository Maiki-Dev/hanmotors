const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  pickupLocation: {
    address: String,
    lat: Number,
    lng: Number
  },
  dropoffLocation: {
    address: String,
    lat: Number,
    lng: Number
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  price: { type: Number, required: true },
  serviceType: { type: String, required: true },
  vehicleModel: String,
  distance: Number,
  duration: Number, // Estimated duration in minutes
  traveledDistance: { type: Number, default: 0 },
  additionalServices: [{
    name: String,
    price: Number
  }],
  hasDamage: { type: Boolean, default: false },
  customerName: String,
  customerPhone: String,
  startTime: Date,
  endTime: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Trip', TripSchema);

