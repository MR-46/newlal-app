const router = require('express').Router();
const { User, Customer } = require('../models');
const { auth, allow } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', auth, allow('admin'), async (req, res) => {
  try {
    const { role, search, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (status === 'blacklisted') filter.isBlacklisted = true;
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { mobile: new RegExp(search, 'i') },
      { shopName: new RegExp(search, 'i') },
    ];

    const users = await User.find(filter).select('-password -pin').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user (admin only)
router.post('/', auth, allow('admin'), async (req, res) => {
  try {
    const { name, mobile, password, pin, role, shopName, city, state, pincode, address } = req.body;
    const existing = await User.findOne({ mobile });
    if (existing) return res.status(400).json({ error: 'Mobile already exists' });

    const user = await User.create({
      name, mobile, password, pin, role, shopName, city, state, pincode, address,
      createdBy: req.user._id
    });

    // If existing_retailer, also create/link customer record
    if (role === 'existing_retailer') {
      await Customer.create({
        name: name.toUpperCase(),
        mobile,
        city: city?.toUpperCase() || '',
        userId: user._id,
        addedBy: req.user._id,
      });
    }

    res.status(201).json({ user: { ...user.toObject(), password: undefined, pin: undefined } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/:id', auth, allow('admin'), async (req, res) => {
  try {
    const { name, mobile, role, shopName, city, state, pincode, address, isActive, catalogUnlocked } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, mobile, role, shopName, city, state, pincode, address, isActive, catalogUnlocked },
      { new: true }
    ).select('-password -pin');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Blacklist / deregister user
router.patch('/:id/status', auth, allow('admin'), async (req, res) => {
  try {
    const { action } = req.body; // 'blacklist', 'activate', 'deactivate', 'unlock_catalog'
    const update = {};
    if (action === 'blacklist') { update.isBlacklisted = true; update.isActive = false; }
    if (action === 'activate') { update.isActive = true; update.isBlacklisted = false; }
    if (action === 'deactivate') update.isActive = false;
    if (action === 'unlock_catalog') update.catalogUnlocked = true;
    if (action === 'lock_catalog') update.catalogUnlocked = false;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password -pin');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Convert new_retailer to existing_retailer
router.post('/:id/convert', auth, allow('admin', 'salesperson'), async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'new_retailer')
      return res.status(400).json({ error: 'User is not a new retailer' });

    user.role = 'existing_retailer';
    user.password = password;
    user.catalogUnlocked = true;
    await user.save();

    // Create customer record
    const existing = await Customer.findOne({ userId: user._id });
    if (!existing) {
      await Customer.create({
        name: user.name.toUpperCase(),
        mobile: user.mobile,
        city: user.city?.toUpperCase() || '',
        userId: user._id,
        addedBy: req.user._id,
      });
    }

    res.json({ message: 'Converted to existing retailer', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get staff list (for assignment dropdown)
router.get('/staff/list', auth, async (req, res) => {
  try {
    const { type } = req.query; // 'b2b' or 'b2c'
    const role = type === 'b2c' ? 'b2c_staff' : 'store_staff';
    const staff = await User.find({ role, isActive: true }).select('name mobile role');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get registered retailers and end users report
router.get('/registered/report', auth, allow('admin'), async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ['new_retailer', 'end_user'] }
    }).select('-password -pin').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
