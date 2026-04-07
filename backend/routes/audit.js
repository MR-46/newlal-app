const router = require('express').Router();
const { Audit } = require('../models');
const { auth, allow } = require('../middleware/auth');

router.get('/', auth, allow('admin'), async (req, res) => {
  try {
    const { entity, userId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (entity) filter.entity = entity;
    if (userId) filter.performedBy = userId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59); filter.createdAt.$lte = d; }
    }
    const skip = (Number(page)-1) * Number(limit);
    const [logs, total] = await Promise.all([
      Audit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Audit.countDocuments(filter),
    ]);
    res.json({ logs, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
