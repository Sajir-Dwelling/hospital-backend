const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const Prescription = require('../models/Prescription');

// @desc    Get all users (with role filter)
// @route   GET /api/admin/users?role=doctor
// @access  Private (admin)
const getUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { department: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/toggle
// @access  Private (admin)
const toggleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.statusCode = 404;
      throw new Error('User not found');
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, isActive: user.isActive });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.statusCode = 404;
      throw new Error('User not found');
    }
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc    Dashboard stats
// @route   GET /api/admin/stats
// @access  Private (admin)
const getStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      todayAppointments,
      invoices,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ date: today }),
      Invoice.find(),
    ]);

    const revenue = {
      total:   invoices.reduce((s, i) => s + i.amount, 0),
      paid:    invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0),
      pending: invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0),
    };

    // Recent appointments
    const recentAppointments = await Appointment.find()
      .populate('patient', 'name avatar')
      .populate('doctor', 'name department')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: { totalPatients, totalDoctors, totalAppointments, todayAppointments, revenue },
      recentAppointments,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, toggleUser, deleteUser, getStats };
