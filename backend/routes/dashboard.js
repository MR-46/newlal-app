// dashboard.js
const router = require('express').Router();
const { Order, User, Item } = require('../models');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

    const baseFilter = { isDeleted: false };
    const todayFilter = { ...baseFilter, createdAt: { $gte: today, $lt: tomorrow } };

    const [todayOrders, pendingB2B, pendingB2C, topItems] = await Promise.all([
      Order.countDocuments(todayFilter),
      Order.countDocuments({ ...baseFilter, status: { $in: ['confirmed','in_progress'] }, orderType: 'b2b' }),
      Order.countDocuments({ ...baseFilter, status: { $in: ['pending_confirmation','confirmed','in_progress'] }, orderType: 'b2c' }),
      Order.aggregate([
        { $match: { ...baseFilter, createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.itemName', totalQty: { $sum: '$items.orderedQty' } } },
        { $sort: { totalQty: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({ todayOrders, pendingB2B, pendingB2C, topItems });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Salesperson performance
router.get('/performance', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const filter = { isDeleted: false };
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59); filter.createdAt.$lte = d; }
    }

    const [spPerf, staffPerf] = await Promise.all([
      Order.aggregate([
        { $match: filter },
        { $group: { _id: '$createdByName', orders: { $sum: 1 }, role: { $first: '$createdByRole' } } },
        { $sort: { orders: -1 } },
      ]),
      Order.aggregate([
        { $match: { ...filter, status: { $in: ['ready','dispatched','shipped','delivered'] } } },
        { $unwind: '$fulfilledByNames' },
        { $group: { _id: '$fulfilledByNames', fulfilled: { $sum: 1 } } },
        { $sort: { fulfilled: -1 } },
      ]),
    ]);

    res.json({ salespersonPerformance: spPerf, staffPerformance: staffPerf });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
