const router = require('express').Router();
const { Order, Customer, Item, Audit } = require('../models');
const { auth, allow } = require('../middleware/auth');

const INTERNAL = ['admin', 'salesperson', 'store_staff', 'b2c_staff'];
const B2B_VIEWERS = ['admin', 'salesperson', 'store_staff', 'existing_retailer'];
const B2C_VIEWERS = ['admin', 'salesperson', 'b2c_staff', 'end_user'];

// Helper: build order filter based on role
const buildFilter = (user, query) => {
  const { status, type, search, dateFrom, dateTo, customerId, salesperson } = query;
  const filter = { isDeleted: false };

  if (type) filter.orderType = type;
  else {
    if (user.role === 'store_staff') filter.orderType = 'b2b';
    if (user.role === 'b2c_staff') filter.orderType = 'b2c';
    if (user.role === 'existing_retailer') { filter.orderType = 'b2b'; filter.customer = user._id; }
    if (user.role === 'end_user') { filter.orderType = 'b2c'; filter.createdBy = user._id; }
  }

  if (status) filter.status = status;
  if (customerId) filter.customer = customerId;
  if (salesperson) filter.createdBy = salesperson;
  if (search) filter.$or = [
    { orderId: new RegExp(search, 'i') },
    { customerName: new RegExp(search, 'i') },
    { 'items.itemName': new RegExp(search, 'i') },
  ];
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) { const d = new Date(dateTo); d.setHours(23,59,59); filter.createdAt.$lte = d; }
  }
  return filter;
};

// GET orders
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const filter = buildFilter(req.user, req.query);
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter).populate('assignedStaff', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pending orders for staff
router.get('/pending', auth, allow('store_staff', 'b2c_staff', 'admin', 'salesperson'), async (req, res) => {
  try {
    const isB2C = req.user.role === 'b2c_staff';
    const filter = {
      isDeleted: false,
      status: { $in: ['confirmed', 'in_progress'] },
      orderType: isB2C ? 'b2c' : 'b2b',
    };
    if (req.user.role === 'store_staff') {
      filter.$or = [
        { assignedStaff: req.user._id },
        { assignedStaff: null },
      ];
    }
    const orders = await Order.find(filter).sort({ isUrgent: -1, createdAt: 1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('assignedStaff', 'name mobile');
    if (!order || order.isDeleted) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE order
router.post('/', auth, async (req, res) => {
  try {
    const { customerName, customerMobile, customerId, items, assignedStaffId, remarks, isUrgent, orderType } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'Items required' });

    // Enrich items with details
    const enrichedItems = await Promise.all(items.map(async (i) => {
      const dbItem = await Item.findById(i.itemId);
      if (!dbItem) throw new Error(`Item not found: ${i.itemId}`);
      return {
        item: dbItem._id,
        itemName: dbItem.itemName,
        partNumber: dbItem.partNumber,
        brand: dbItem.brand,
        vehicle: dbItem.vehicle,
        unit: dbItem.unit,
        orderedQty: i.qty,
        pickedQty: 0,
      };
    }));

    // Determine order type and status
    let type = orderType || 'b2b';
    let status = 'placed';

    // External retailer placing order → needs confirmation
    if (['existing_retailer'].includes(req.user.role)) status = 'pending_confirmation';
    // End user order → awaiting confirmation + payment
    if (req.user.role === 'end_user') { type = 'b2c'; status = 'pending_confirmation'; }
    // Salesperson / admin placing → goes straight to confirmed
    if (['admin', 'salesperson'].includes(req.user.role)) status = 'confirmed';

    // Resolve customer
    let resolvedCustomer = null, resolvedName = customerName, resolvedMobile = customerMobile;
    if (customerId) {
      resolvedCustomer = customerId;
      const c = await Customer.findById(customerId);
      if (c) { resolvedName = c.name; resolvedMobile = c.mobile; }
    } else if (customerName) {
      // Create new customer on the fly
      const newC = await Customer.create({
        name: customerName.toUpperCase(),
        mobile: customerMobile || '',
        addedBy: req.user._id,
      });
      resolvedCustomer = newC._id;
    }

    const order = await Order.create({
      orderType: type,
      status,
      customer: resolvedCustomer,
      customerName: resolvedName?.toUpperCase(),
      customerMobile: resolvedMobile,
      createdBy: req.user._id,
      createdByName: req.user.name,
      createdByRole: req.user.role,
      assignedStaff: assignedStaffId || null,
      items: enrichedItems,
      remarks,
      isUrgent: isUrgent || false,
      statusHistory: [{ status, changedBy: req.user._id, changedByName: req.user.name }],
    });

    // Update customer stats
    if (resolvedCustomer) {
      await Customer.findByIdAndUpdate(resolvedCustomer, {
        $inc: { totalOrders: 1 },
        lastOrderDate: new Date(),
      });
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE order (admin/salesperson can edit before confirmed)
router.put('/:id', auth, allow('admin', 'salesperson'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (['in_progress','ready','dispatched','shipped','delivered'].includes(order.status))
      return res.status(400).json({ error: 'Cannot edit order in this status' });

    const { items, customerName, customerMobile, remarks, isUrgent, assignedStaffId } = req.body;
    if (items) {
      order.items = await Promise.all(items.map(async (i) => {
        const dbItem = await Item.findById(i.itemId || i.item);
        return {
          item: dbItem._id,
          itemName: dbItem.itemName,
          partNumber: dbItem.partNumber,
          brand: dbItem.brand,
          vehicle: dbItem.vehicle,
          unit: dbItem.unit,
          orderedQty: i.qty || i.orderedQty,
          pickedQty: i.pickedQty || 0,
        };
      }));
    }
    if (customerName) order.customerName = customerName.toUpperCase();
    if (customerMobile) order.customerMobile = customerMobile;
    if (remarks !== undefined) order.remarks = remarks;
    if (isUrgent !== undefined) order.isUrgent = isUrgent;
    if (assignedStaffId !== undefined) order.assignedStaff = assignedStaffId;

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE order STATUS
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, note, trackingNumber, courierPartner } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order || order.isDeleted) return res.status(404).json({ error: 'Not found' });

    // Validation rules
    if (status === 'dispatched' && order.status !== 'ready')
      return res.status(400).json({ error: 'Mark as Ready before Dispatching' });
    if (status === 'shipped' && order.status !== 'ready')
      return res.status(400).json({ error: 'Mark as Ready before Shipping' });

    // Staff starting fulfillment
    if (status === 'in_progress') {
      if (!order.fulfilledBy.includes(req.user._id)) {
        order.fulfilledBy.push(req.user._id);
        order.fulfilledByNames.push(req.user.name);
      }
    }

    // Reset in_progress (undo)
    if (status === 'confirmed' && order.status === 'in_progress') {
      order.fulfilledBy = [];
      order.fulfilledByNames = [];
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (courierPartner) order.courierPartner = courierPartner;
    order.statusHistory.push({ status, changedBy: req.user._id, changedByName: req.user.name, note });

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE item checkboxes (staff fulfillment)
router.patch('/:id/items', auth, allow('store_staff', 'b2c_staff', 'admin', 'salesperson'), async (req, res) => {
  try {
    const { itemUpdates } = req.body; // [{ itemId, isChecked, pickedQty, isRestockNeeded }]
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });

    itemUpdates.forEach(update => {
      const item = order.items.id(update.itemId);
      if (item) {
        if (update.isChecked !== undefined) item.isChecked = update.isChecked;
        if (update.pickedQty !== undefined) item.pickedQty = update.pickedQty;
        if (update.isRestockNeeded !== undefined) item.isRestockNeeded = update.isRestockNeeded;
      }
    });

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE order (soft delete - goes to recycle bin)
router.delete('/:id', auth, allow('admin', 'salesperson'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (['in_progress','ready','dispatched','shipped','delivered'].includes(order.status))
      return res.status(400).json({ error: 'Cannot delete order in this status' });

    order.isDeleted = true;
    order.deletedAt = new Date();
    await order.save();
    res.json({ message: 'Order moved to recycle bin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RECYCLE BIN (admin)
router.get('/bin/list', auth, allow('admin'), async (req, res) => {
  try {
    const orders = await Order.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESTORE from recycle bin (admin)
router.patch('/:id/restore', auth, allow('admin'), async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null });
    res.json({ message: 'Order restored' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer order history (for reorder)
router.get('/customer/:customerId/history', auth, async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.params.customerId,
      isDeleted: false,
      status: { $ne: 'cancelled' },
    }).sort({ createdAt: -1 }).limit(20);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
