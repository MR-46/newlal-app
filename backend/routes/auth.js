const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { auth } = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// Internal login (admin, salesperson, store_staff, b2c_staff) - mobile + password
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ error: 'Mobile and password required' });

    const user = await User.findOne({ mobile: mobile.trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.isBlacklisted) return res.status(403).json({ error: 'Account is blacklisted' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is inactive' });

    const internalRoles = ['admin', 'salesperson', 'store_staff', 'b2c_staff', 'existing_retailer'];
    const externalRoles = ['new_retailer', 'end_user'];

    let match = false;
    if (internalRoles.includes(user.role) && user.password) {
      match = await user.comparePassword(password);
    } else if (externalRoles.includes(user.role) && user.pin) {
      match = await user.comparePin(password); // external uses PIN as password field in login
    }

    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        shopName: user.shopName,
        city: user.city,
        catalogUnlocked: user.catalogUnlocked,
        isActive: user.isActive,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// External self-registration (new_retailer, end_user)
router.post('/register', async (req, res) => {
  try {
    const { name, mobile, pin, role, shopName, city, state, pincode, address } = req.body;
    if (!name || !mobile || !pin || !role)
      return res.status(400).json({ error: 'Name, mobile, PIN and role are required' });
    if (!['new_retailer', 'end_user'].includes(role))
      return res.status(400).json({ error: 'Invalid role for self-registration' });
    if (pin.length < 4 || pin.length > 6)
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });

    const existing = await User.findOne({ mobile: mobile.trim() });
    if (existing) return res.status(400).json({ error: 'Mobile number already registered' });

    const userData = { name, mobile: mobile.trim(), pin, role, city, state, pincode };
    if (role === 'new_retailer') userData.shopName = shopName;
    if (role === 'end_user') userData.address = address;

    const user = await User.create(userData);
    const token = signToken(user._id);

    // TODO: notify admin via in-app notification

    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, mobile: user.mobile, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset PIN (external users) via security question
router.post('/reset-pin', async (req, res) => {
  try {
    const { mobile, securityAnswer, newPin } = req.body;
    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.securityAnswer?.toLowerCase() !== securityAnswer?.toLowerCase())
      return res.status(400).json({ error: 'Incorrect answer' });

    user.pin = newPin;
    await user.save();
    res.json({ message: 'PIN reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin resets any user password/pin
router.post('/admin-reset/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { newPassword } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const internalRoles = ['admin', 'salesperson', 'store_staff', 'b2c_staff'];
    if (internalRoles.includes(user.role)) user.password = newPassword;
    else user.pin = newPassword;

    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
