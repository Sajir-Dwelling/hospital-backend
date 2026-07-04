const express = require('express');
const router = express.Router();
const { getInvoices, createInvoice, markPaid } = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(authorize('admin'), createInvoice);

router.put('/:id/pay', authorize('admin'), markPaid);

module.exports = router;
