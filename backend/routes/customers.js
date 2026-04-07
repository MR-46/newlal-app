// customers.js
const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { Customer, Order, Payment } = require('../models');
const { auth, allow } = require('../middleware/auth');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { isActive: true };
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { mobile: new RegExp(search, 'i') },
      { city: new RegExp(search, 'i') },
    ];
    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json(customers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, allow('admin', 'salesperson'), async (req, res) => {
  try {
    const { name, mobile, city } = req.body;
    const c = await Customer.create({ name: name.toUpperCase(), mobile, city: city?.toUpperCase(), addedBy: req.user._id });
    res.status(201).json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upload', auth, allow('admin'), upload.single('file'), async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    let added = 0, skipped = 0;
    for (const row of data) {
      const name = (row['Name'] || row['NAME'] || '').toString().trim().toUpperCase();
      const mobile = (row['Mobile Number'] || row['Mobile'] || '').toString().trim();
      if (!name) continue;
      const exists = await Customer.findOne({ name, mobile });
      if (exists) { skipped++; continue; }
      await Customer.create({ name, mobile, addedBy: req.user._id });
      added++;
    }
    res.json({ added, skipped, total: data.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Account statement
router.get('/:id/statement', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ customer: req.params.id }).sort({ createdAt: -1 });
    const orders = await Order.find({ customer: req.params.id, isDeleted: false }).sort({ createdAt: -1 });
    res.json({ payments, orders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Record payment
router.post('/:id/payment', auth, allow('admin', 'salesperson'), async (req, res) => {
  try {
    const { amount, method, reference, note, orderId, type } = req.body;
    const p = await Payment.create({
      customer: req.params.id, order: orderId,
      type: type || 'credit', amount, method, reference, note,
      recordedBy: req.user._id, recordedByName: req.user.name,
    });
    res.status(201).json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Items not ordered recently
router.get('/:id/not-ordered', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 60;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({ customer: req.params.id, createdAt: { $gte: since } });
    const recentItemIds = new Set(recentOrders.flatMap(o => o.items.map(i => i.item.toString())));
    const pastOrders = await Order.find({ customer: req.params.id, createdAt: { $lt: since } });
    const pastItems = {};
    pastOrders.forEach(o => o.items.forEach(i => {
      const id = i.item.toString();
      if (!recentItemIds.has(id)) pastItems[id] = i.itemName;
    }));
    res.json(Object.entries(pastItems).map(([id, name]) => ({ itemId: id, itemName: name })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
