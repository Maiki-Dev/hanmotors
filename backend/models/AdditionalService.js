const mongoose = require('mongoose');

const AdditionalServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('AdditionalService', AdditionalServiceSchema);
