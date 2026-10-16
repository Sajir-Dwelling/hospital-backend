const express = require('express');
const router = express.Router();
const {
  getInvoices, createInvoice, markPaid,
  initiatePayment, paymentSuccess, paymentFail, paymentCancel, paymentIPN,
} = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/auth');

// SSLCommerz posts form data, not JSON
const form = express.urlencoded({ extended: true });

// Public routes called by SSLCommerz. These must stay ABOVE router.use(protect).
router.all('/payment/success', form, paymentSuccess);
router.all('/payment/fail', form, paymentFail);
router.all('/payment/cancel', form, paymentCancel);
router.post('/payment/ipn', form, paymentIPN);

router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(authorize('admin'), createInvoice);

router.post('/:id/pay-online', authorize('patient'), initiatePayment);
router.put('/:id/pay', authorize('admin'), markPaid);

module.exports = router;
