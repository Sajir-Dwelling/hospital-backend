const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');

// Give stock back (used when a later step fails)
const restoreStock = async (deducted) => {
  for (const d of deducted) {
    await Medicine.updateOne({ _id: d.id }, { $inc: { stock: d.qty } });
  }
};

// @desc    Create prescription
// @route   POST /api/prescriptions
// @access  Private (doctor)
const createPrescription = async (req, res, next) => {
  const deducted = [];
  try {
    const { patientId, appointmentId, diagnosis, medicines, notes } = req.body;
    const items = Array.isArray(medicines) ? medicines : [];

    // Deduct stock for items picked from inventory. Atomic: never goes below 0.
    for (const m of items) {
      const qty = Number(m.quantity) || 0;
      if (!m.medicine || qty <= 0) continue;

      const updated = await Medicine.findOneAndUpdate(
        {
          _id: m.medicine,
          stock: { $gte: qty },
          $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: new Date() } }],
        },
        { $inc: { stock: -qty } },
        { new: true }
      );

      if (!updated) {
        await restoreStock(deducted);
        res.statusCode = 400;
        throw new Error(`"${m.name || 'Medicine'}" is out of stock, expired, or has less than ${qty} left`);
      }
      deducted.push({ id: updated._id, qty });
    }

    let prescription;
    try {
      prescription = await Prescription.create({
        patient: patientId,
        doctor: req.user._id,
        appointment: appointmentId || undefined,
        diagnosis,
        medicines: items,
        notes: notes || '',
      });
    } catch (err) {
      await restoreStock(deducted);
      throw err;
    }

    await prescription.populate([
      { path: 'patient', select: 'name email avatar age bloodGroup' },
      { path: 'doctor', select: 'name department qualification' },
    ]);

    res.status(201).json({ success: true, prescription });
  } catch (err) {
    next(err);
  }
};

// @desc    Get prescriptions
// @route   GET /api/prescriptions
// @access  Private
const getPrescriptions = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'patient') filter.patient = req.user._id;
    else if (req.user.role === 'doctor') filter.doctor = req.user._id;

    const prescriptions = await Prescription.find(filter)
      .populate('patient', 'name avatar age bloodGroup')
      .populate('doctor', 'name department')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: prescriptions.length, prescriptions });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single prescription
// @route   GET /api/prescriptions/:id
// @access  Private
const getPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'name email avatar age bloodGroup phone')
      .populate('doctor', 'name department qualification');

    if (!prescription) {
      res.statusCode = 404;
      throw new Error('Prescription not found');
    }

    res.json({ success: true, prescription });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPrescription, getPrescriptions, getPrescription };
