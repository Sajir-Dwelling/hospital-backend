const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
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
  date: {
    type: String,  // "YYYY-MM-DD"
    required: [true, 'Appointment date is required'],
  },
  time: {
    type: String,  // "10:00 AM"
    required: [true, 'Appointment time is required'],
  },
  type: {
    type: String,
    enum: ['Consultation', 'Follow-up', 'New Patient', 'Emergency'],
    default: 'Consultation',
  },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  notes: { type: String, default: '' },
}, { timestamps: true });

// Prevent double-booking: same doctor, date, time
appointmentSchema.index({ doctor: 1, date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
