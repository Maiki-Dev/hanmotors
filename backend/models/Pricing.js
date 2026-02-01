const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  vehicleType: { type: String, required: true },
  basePrice: { type: Number, required: true }, // Price for first 4km
  pricePerKm: { type: Number, required: true }, // Price per km after 4km
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Pricing', pricingSchema);
