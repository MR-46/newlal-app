const router = require('express').Router();
const { Enquiry, Item } = require('../models');
const { auth, allow } = require('../middleware/auth');

router.get('/', auth, allow('admin', 'salesperson'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, allow('new_retailer'), async (req, res) => {
  try {
    const { items } = req.body;
    const enriched = await Promise.all(items.map(async i => {
      const dbItem = await Item.findById(i.itemId);
      return {
        item: dbItem._id, itemName: dbItem.itemName,
        partNumber: dbItem.partNumber, brand: dbItem.brand,
        vehicle: dbItem.vehicle, enquiredQty: i.qty,
      };
    }));
    const enq = await Enquiry.create({
      retailer: req.user._id,
      retailerName: req.user.name,
      shopName: req.user.shopName,
      mobile: req.user.mobile,
      city: req.user.city,
      state: req.user.state,
      pincode: req.user.pincode,
      items: enriched,
    });
    res.status(201).json(enq);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/status', auth, allow('admin', 'salesperson'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const enq = await Enquiry.findByIdAndUpdate(req.params.id, { status, notes }, { new: true });
    res.json(enq);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
