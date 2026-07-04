const express = require('express');
const router = express.Router();
const {
  bookAppointment, getAppointments, getAppointment,
  updateStatus, cancelAppointment, getTodaySchedule,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/today', authorize('doctor'), getTodaySchedule);
router.route('/')
  .get(getAppointments)
  .post(authorize('patient'), bookAppointment);

router.route('/:id')
  .get(getAppointment);

router.put('/:id/status', authorize('doctor', 'admin'), updateStatus);
router.put('/:id/cancel', cancelAppointment);

module.exports = router;
