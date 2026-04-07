// reports.js
const router = require('express').Router();
const { Order, Customer, Item } = require('../models');
const { auth, allow } = require('../middleware/auth');

// Stockout report
router.get('/stockout', auth, allow('admin', 'salesperson'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const filter = { isDeleted: false, 'items.isRestockNeeded': true };
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59); filter.createdAt.$lte = d; }
    }
    const orders = await Order.find(filter);
    const stockout = {};
    orders.forEach(o => {
      o.items.filter(i => i.isRestockNeeded).forEach(i => {
        if (!stockout[i.itemName]) stockout[i.itemName] = { itemName: i.itemName, partNumber: i.partNumber, customers: [] };
        stockout[i.itemName].customers.push(o.customerName);
      });
    });
    const result = Object.values(stockout).map(s => ({
      ...s, customers: [...new Set(s.customers)].join(', ')
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Customer order history report
router.get('/customer-orders', auth, allow('admin', 'salesperson'), async (req, res) => {
  try {
    const { customerId, dateFrom, dateTo } = req.query;
    const filter = { isDeleted: false };
    if (customerId) filter.customer = customerId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59); filter.createdAt.$lte = d; }
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Customer frequency report
router.get('/customer-frequency', auth, allow('admin', 'salesperson'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const filter = { isDeleted: false };
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59); filter.createdAt.$lte = d; }
    }
    const result = await Order.aggregate([
      { $match: filter },
      { $group: { _id: '$customerName', orderCount: { $sum: 1 }, lastOrder: { $max: '$createdAt' } } },
      { $sort: { orderCount: -1 } },
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
