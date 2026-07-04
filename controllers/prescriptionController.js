const Prescription = require('../models/Prescription');

// @desc    Create prescription
// @route   POST /api/prescriptions
// @access  Private (doctor)
const createPrescription = async (req, res, next) => {
  try {
    const { patientId, appointmentId, diagnosis, medicines, notes } = req.body;

    const prescription = await Prescription.create({
      patient: patientId,
      doctor: req.user._id,
      appointment: appointmentId || undefined,
      diagnosis,
      medicines: medicines || [],
      notes: notes || '',
    });

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
