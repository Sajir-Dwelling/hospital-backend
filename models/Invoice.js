const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue'],
    default: 'Pending',
  },
  description: { type: String, default: 'Consultation Fee' },
  paidAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
