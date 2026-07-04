const express = require('express');
const router = express.Router();
const { getUsers, toggleUser, deleteUser, getStats } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/toggle', toggleUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
