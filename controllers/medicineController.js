const Medicine = require('../models/Medicine');

const fail = (res, code, msg) => { res.statusCode = code; throw new Error(msg); };

// GET /api/medicines            (admin, doctor)
// GET /api/medicines?available=true  -> only in-stock and not expired (for prescribing)
const getMedicines = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.available === 'true') {
      filter.stock = { $gt: 0 };
      filter.$or = [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: new Date() } }];
    }
    if (req.query.search) {
      const s = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: s, $options: 'i' };
    }
    const medicines = await Medicine.find(filter).sort({ name: 1 });
    res.json({ success: true, count: medicines.length, medicines });
  } catch (err) { next(err); }
};

// POST /api/medicines (admin)
const createMedicine = async (req, res, next) => {
  try {
    const { name, category, manufacturer, stock, unitPrice, lowStockLevel, expiryDate } = req.body;
    const medicine = await Medicine.create({
      name, category, manufacturer, stock, unitPrice, lowStockLevel,
      expiryDate: expiryDate || undefined,
    });
    res.status(201).json({ success: true, medicine });
  } catch (err) { next(err); }
};

// PUT /api/medicines/:id (admin)
const updateMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) fail(res, 404, 'Medicine not found');
    ['name', 'category', 'manufacturer', 'stock', 'unitPrice', 'lowStockLevel'].forEach(k => {
      if (req.body[k] !== undefined) medicine[k] = req.body[k];
    });
    if (req.body.expiryDate !== undefined) medicine.expiryDate = req.body.expiryDate || undefined;
    await medicine.save();
    res.json({ success: true, medicine });
  } catch (err) { next(err); }
};

// DELETE /api/medicines/:id (admin)
const deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) fail(res, 404, 'Medicine not found');
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getMedicines, createMedicine, updateMedicine, deleteMedicine };
