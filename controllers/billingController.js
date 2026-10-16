const Invoice = require('../models/Invoice');
const { emitToUser } = require('../socket');

// ── SSLCommerz helpers ────────────────────────────────────────────
const sslBase = () =>
  process.env.SSLC_IS_LIVE === 'true'
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com';

const frontendUrl = () =>
  (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

const returnPath = () => process.env.PAYMENT_RETURN_PATH || '/patient/dashboard';

const backToApp = (res, result) =>
  res.redirect(`${frontendUrl()}${returnPath()}?payment=${result}`);

// Asks SSLCommerz whether this payment really happened
const validatePayment = async (valId) => {
  const query = new URLSearchParams({
    val_id: valId,
    store_id: process.env.SSLC_STORE_ID,
    store_passwd: process.env.SSLC_STORE_PASSWORD,
    format: 'json',
  });
  const response = await fetch(`${sslBase()}/validator/api/validationserverAPI.php?${query}`);
  return response.json();
};

// Marks the invoice Paid ONLY if SSLCommerz confirms it. Safe to call twice.
const finalizePayment = async (body) => {
  const { val_id, tran_id } = body || {};
  if (!val_id || !tran_id) return false;

  const invoice = await Invoice.findOne({ tranId: tran_id });
  if (!invoice) return false;
  if (invoice.status === 'Paid') return true;

  const v = await validatePayment(val_id);

  const statusOk = v.status === 'VALID' || v.status === 'VALIDATED';
  const tranOk = v.tran_id === tran_id;
  const amountOk = [v.amount, v.currency_amount].some(
    (a) => Math.abs(Number(a) - invoice.amount) < 0.01
  );

  if (!statusOk || !tranOk || !amountOk) {
    console.error('Payment validation failed:', { status: v.status, tran_id: v.tran_id, amount: v.amount });
    return false;
  }

  invoice.status = 'Paid';
  invoice.paidAt = new Date();
  invoice.valId = val_id;
  invoice.paymentMethod = v.card_type || 'SSLCommerz';
  await invoice.save();
  emitToUser(invoice.patient, 'invoice:updated', { invoiceId: invoice._id, reason: 'paid' });
  return true;
};

// ── Existing handlers ─────────────────────────────────────────────

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
    emitToUser(invoice.patient, 'invoice:updated', { invoiceId: invoice._id, reason: 'paid' });

    res.json({ success: true, invoice });
  } catch (err) {
    next(err);
  }
};

// ── Online payment (SSLCommerz) ───────────────────────────────────

// @desc    Start an online payment for one invoice
// @route   POST /api/billing/:id/pay-online
// @access  Private (patient)
const initiatePayment = async (req, res, next) => {
  try {
    if (!process.env.SSLC_STORE_ID || !process.env.SSLC_STORE_PASSWORD || !process.env.BACKEND_URL) {
      res.statusCode = 500;
      throw new Error('Online payment is not configured');
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      res.statusCode = 404;
      throw new Error('Invoice not found');
    }
    if (invoice.patient.toString() !== req.user._id.toString()) {
      res.statusCode = 403;
      throw new Error('Not authorized to pay this invoice');
    }
    if (invoice.status === 'Paid') {
      res.statusCode = 400;
      throw new Error('This invoice is already paid');
    }

    // The amount always comes from the database, never from the browser
    const tranId = `INV${invoice._id}${Date.now()}`;
    invoice.tranId = tranId;
    await invoice.save();

    const backend = process.env.BACKEND_URL.replace(/\/$/, '');

    const params = new URLSearchParams({
      store_id: process.env.SSLC_STORE_ID,
      store_passwd: process.env.SSLC_STORE_PASSWORD,
      total_amount: invoice.amount.toFixed(2),
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${backend}/api/billing/payment/success`,
      fail_url: `${backend}/api/billing/payment/fail`,
      cancel_url: `${backend}/api/billing/payment/cancel`,
      ipn_url: `${backend}/api/billing/payment/ipn`,
      shipping_method: 'NO',
      product_name: invoice.description || 'Consultation Fee',
      product_category: 'Healthcare',
      product_profile: 'general',
      cus_name: req.user.name || 'Patient',
      cus_email: req.user.email,
      cus_add1: req.user.address || 'Dhaka',
      cus_city: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: req.user.phone || '01700000000',
    });

    const response = await fetch(`${sslBase()}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const data = await response.json();

    if (!data.GatewayPageURL) {
      console.error('SSLCommerz session error:', data.status, data.failedreason);
      res.statusCode = 502;
      throw new Error(data.failedreason || 'Could not start the payment');
    }

    res.json({ success: true, url: data.GatewayPageURL });
  } catch (err) {
    next(err);
  }
};

// The four handlers below are called by SSLCommerz (no login), so they
// only ever trust what SSLCommerz's validation API says.

const paymentSuccess = async (req, res) => {
  try {
    const ok = await finalizePayment(req.body);
    return backToApp(res, ok ? 'success' : 'failed');
  } catch (err) {
    console.error('Payment error:', err.message);
    return backToApp(res, 'failed');
  }
};

const paymentFail = (_req, res) => backToApp(res, 'failed');
const paymentCancel = (_req, res) => backToApp(res, 'cancelled');

// Server-to-server notice, catches payments where the customer closed the tab
const paymentIPN = async (req, res) => {
  try {
    await finalizePayment(req.body);
  } catch (err) {
    console.error('IPN error:', err.message);
  }
  res.sendStatus(200);
};

module.exports = {
  getInvoices, createInvoice, markPaid,
  initiatePayment, paymentSuccess, paymentFail, paymentCancel, paymentIPN,
};
