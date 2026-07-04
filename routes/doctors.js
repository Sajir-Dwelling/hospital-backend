const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { protect } = require('../middleware/auth');

// @desc    Get all doctors (public — for booking page)
// @route   GET /api/doctors
router.get('/', protect, async (req, res, next) => {
  try {
    const { dept, search } = req.query;
    const filter = { role: 'doctor', isActive: true };
    if (dept) filter.department = { $regex: dept, $options: 'i' };
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
    ];

    const doctors = await User.find(filter).select('-password');
    res.json({ success: true, count: doctors.length, doctors });
  } catch (err) { next(err); }
});

// @desc    Get booked slots for a doctor on a date
// @route   GET /api/doctors/:id/slots?date=YYYY-MM-DD
router.get('/:id/slots', protect, async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

    const booked = await Appointment.find({
      doctor: req.params.id,
      date,
      status: { $ne: 'Cancelled' },
    }).select('time');

    const bookedTimes = booked.map(a => a.time);
    const ALL_SLOTS = [
      '09:00 AM','10:00 AM','11:00 AM','12:00 PM',
      '02:00 PM','03:00 PM','04:00 PM','05:00 PM',
    ];
    const available = ALL_SLOTS.filter(s => !bookedTimes.includes(s));

    res.json({ success: true, available, booked: bookedTimes });
  } catch (err) { next(err); }
});

module.exports = router;
