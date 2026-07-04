const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  dose:     { type: String, required: true },
  freq:     { type: String, required: true },
  duration: { type: String, required: true },
});

const prescriptionSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
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
  diagnosis: { type: String, required: [true, 'Diagnosis is required'] },
  medicines:  { type: [medicineSchema], default: [] },
  notes:      { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
