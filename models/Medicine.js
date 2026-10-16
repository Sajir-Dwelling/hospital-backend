const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name:         { type: String, required: [true, 'Medicine name is required'], trim: true },
  category:     { type: String, default: 'General', trim: true },
  manufacturer: { type: String, default: '', trim: true },
  stock:        { type: Number, required: true, min: [0, 'Stock cannot be negative'], default: 0 },
  unitPrice:    { type: Number, min: 0, default: 0 },
  lowStockLevel:{ type: Number, min: 0, default: 10 },
  expiryDate:   { type: Date },
}, { timestamps: true });

medicineSchema.index({ name: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
