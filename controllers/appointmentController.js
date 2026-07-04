const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Invoice = require('../models/Invoice');

// @desc    Book appointment (patient)
// @route   POST /api/appointments
// @access  Private (patient)
const bookAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, time, type, reason } = req.body;

    // Validate doctor exists
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor', isActive: true });
    if (!doctor) {
      res.statusCode = 404;
      throw new Error('Doctor not found');
    }

    // Check for double booking
    const conflict = await Appointment.findOne({ doctor: doctorId, date, time, status: { $ne: 'Cancelled' } });
    if (conflict) {
      res.statusCode = 400;
      throw new Error('This time slot is already booked');
    }

    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      date, time,
      type: type || 'Consultation',
      reason: reason || '',
      status: 'Pending',
    });

    await appointment.populate(['patient', 'doctor']);

    res.status(201).json({ success: true, appointment });
  } catch (err) {
    next(err);
  }
};

// @desc    Get appointments (filtered by role)
// @route   GET /api/appointments
// @access  Private
const getAppointments = async (req, res, next) => {
  try {
    const { status, date } = req.query;
    let filter = {};

    if (req.user.role === 'patient') filter.patient = req.user._id;
    else if (req.user.role === 'doctor') filter.doctor = req.user._id;
    // admin gets all

    if (status) filter.status = status;
    if (date) filter.date = date;

    const appointments = await Appointment.find(filter)
      .populate('patient', 'name email avatar bloodGroup age phone')
      .populate('doctor', 'name email avatar department')
      .sort({ date: -1, time: 1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
const getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name email avatar bloodGroup age phone')
      .populate('doctor', 'name email avatar department qualification');

    if (!appointment) {
      res.statusCode = 404;
      throw new Error('Appointment not found');
    }

    // Access check
    const isOwner =
      appointment.patient._id.toString() === req.user._id.toString() ||
      appointment.doctor._id.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isOwner) {
      res.statusCode = 403;
      throw new Error('Not authorized to view this appointment');
    }

    res.json({ success: true, appointment });
  } catch (err) {
    next(err);
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private (doctor/admin)
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];

    if (!allowed.includes(status)) {
      res.statusCode = 400;
      throw new Error('Invalid status value');
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.statusCode = 404;
      throw new Error('Appointment not found');
    }

    appointment.status = status;
    await appointment.save();

    // Auto-create invoice when completed
    if (status === 'Completed') {
      const existing = await Invoice.findOne({ appointment: appointment._id });
      if (!existing) {
        await Invoice.create({
          patient: appointment.patient,
          doctor: appointment.doctor,
          appointment: appointment._id,
          amount: 1500,
          description: 'Consultation Fee',
          status: 'Pending',
        });
      }
    }

    await appointment.populate(['patient', 'doctor']);
    res.json({ success: true, appointment });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel appointment (patient can cancel their own)
// @route   PUT /api/appointments/:id/cancel
// @access  Private
const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.statusCode = 404;
      throw new Error('Appointment not found');
    }

    const isPatientOwner = appointment.patient.toString() === req.user._id.toString();
    const isAuthorized = isPatientOwner || req.user.role === 'admin' || req.user.role === 'doctor';

    if (!isAuthorized) {
      res.statusCode = 403;
      throw new Error('Not authorized');
    }

    if (appointment.status === 'Completed') {
      res.statusCode = 400;
      throw new Error('Cannot cancel a completed appointment');
    }

    appointment.status = 'Cancelled';
    await appointment.save();

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get today's schedule (doctor)
// @route   GET /api/appointments/today
// @access  Private (doctor)
const getTodaySchedule = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await Appointment.find({
      doctor: req.user._id,
      date: today,
    })
      .populate('patient', 'name avatar bloodGroup age phone')
      .sort({ time: 1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (err) {
    next(err);
  }
};

module.exports = { bookAppointment, getAppointments, getAppointment, updateStatus, cancelAppointment, getTodaySchedule };
