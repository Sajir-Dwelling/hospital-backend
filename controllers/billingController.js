const Invoice = require('../models/Invoice');

// @desc    Get invoices
// @route   GET /api/billing
// @access  Private
const getInvoices = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'patient') filter.patient = req.user._id;
    else if (req.user.role === 'doctor') filter.doctor = req.user._id;

    const { status } = req.query;
    if (status) filter.status = status;

    const invoices = await Invoice.find(filter)
      .populate('patient', 'name email avatar')
      .populate('doctor', 'name department')
      .populate('appointment', 'date time type')
      .sort({ createdAt: -1 });

    // Summary stats
    const total   = invoices.reduce((s, i) => s + i.amount, 0);
    const paid    = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
    const pending = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0);
    const overdue = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);

    res.json({ success: true, count: invoices.length, summary: { total, paid, pending, overdue }, invoices });
  } catch (err) {
    next(err);
  }
};

// @desc    Create invoice (admin)
// @route   POST /api/billing
// @access  Private (admin)
const createInvoice = async (req, res, next) => {
  try {
    const { patientId, doctorId, appointmentId, amount, description } = req.body;

    const invoice = await Invoice.create({
      patient: patientId,
      doctor: doctorId,
      appointment: appointmentId || undefined,
      amount,
      description: description || 'Consultation Fee',
    });

    await invoice.populate(['patient', 'doctor']);
    res.status(201).json({ success: true, invoice });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark invoice as paid
// @route   PUT /api/billing/:id/pay
// @access  Private (admin)
const markPaid = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      res.statusCode = 404;
      throw new Error('Invoice not found');
    }

    invoice.status = 'Paid';
    invoice.paidAt = new Date();
    await invoice.save();

    res.json({ success: true, invoice });
  } catch (err) {
    next(err);
  }
};

module.exports = { getInvoices, createInvoice, markPaid };
