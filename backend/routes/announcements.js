// announcements.js
const router = require('express').Router();
const { Announcement } = require('../models');
const { auth, allow } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const announcements = await Announcement.find({
      isActive: true,
      $or: [{ targetRoles: req.user.role }, { targetRoles: { $size: 0 } }],
    }).sort({ createdAt: -1 }).limit(10);
    res.json(announcements);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, allow('admin'), async (req, res) => {
  try {
    const a = await Announcement.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(a);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, allow('admin'), async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
