const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { Item } = require('../models');
const { auth, allow } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Search / list items
router.get('/', auth, async (req, res) => {
  try {
    const { q, vehicle, brand, showcaseOnly, page = 1, limit = 50 } = req.query;
    const filter = { isActive: true };

    // For unverified new retailer - only showcase items
    if (req.user.role === 'new_retailer' && !req.user.catalogUnlocked) {
      filter.isShowcase = true;
    }
    if (showcaseOnly === 'true') filter.isShowcase = true;

    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { itemName: regex },
        { partNumber: regex },
        { brand: regex },
        { vehicle: regex },
        { originalDescription: regex },
      ];
    }
    if (vehicle) filter.vehicle = new RegExp(vehicle, 'i');
    if (brand) filter.brand = new RegExp(brand, 'i');

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Item.find(filter).sort({ itemName: 1 }).skip(skip).limit(Number(limit)),
      Item.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single item
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unique vehicles list
router.get('/meta/vehicles', auth, async (req, res) => {
  try {
    const vehicles = await Item.distinct('vehicle', { isActive: true, vehicle: { $ne: '' } });
    res.json(vehicles.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unique brands list
router.get('/meta/brands', auth, async (req, res) => {
  try {
    const brands = await Item.distinct('brand', { isActive: true, brand: { $ne: '' } });
    res.json(brands.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add single item (admin only)
router.post('/', auth, allow('admin'), async (req, res) => {
  try {
    const { itemName, vehicle, brand, partNumber, unit, mrp, slabPricing, isShowcase } = req.body;
    if (!itemName) return res.status(400).json({ error: 'Item name is required' });

    const item = await Item.create({
      originalDescription: itemName.toUpperCase(),
      itemName: itemName.toUpperCase(),
      vehicle: vehicle?.toUpperCase() || '',
      brand: brand?.toUpperCase() || '',
      partNumber: partNumber?.toUpperCase() || '',
      unit: unit?.toUpperCase() || 'NOS',
      mrp, slabPricing, isShowcase: isShowcase || false,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update item (admin)
router.put('/:id', auth, allow('admin'), async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update showcase items (admin)
router.post('/showcase', auth, allow('admin'), async (req, res) => {
  try {
    const { itemIds } = req.body; // array of item _ids to mark as showcase
    await Item.updateMany({}, { isShowcase: false });
    await Item.updateMany({ _id: { $in: itemIds } }, { isShowcase: true });
    res.json({ message: `${itemIds.length} items set as showcase` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Excel - ADD new items (duplicates ignored)
router.post('/upload/add', auth, allow('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

    let added = 0, skipped = 0, errors = [];
    for (const row of data) {
      const itemName = (row['ITEM NAME'] || row['Item Name'] || row['itemName'] || '').toString().trim().toUpperCase();
      const partNumber = (row['PART NUMBER'] || row['Part Number'] || row['partNumber'] || '').toString().trim().toUpperCase();
      const brand = (row['BRAND/GROUP'] || row['Brand/Group'] || row['brand'] || '').toString().trim().toUpperCase();
      const vehicle = (row['VEHICLE'] || row['vehicle'] || '').toString().trim().toUpperCase();
      const unit = (row['UNIT'] || row['unit'] || 'NOS').toString().trim().toUpperCase();
      const originalDescription = (row['ORIGINAL DESCRIPTION'] || itemName).toString().trim().toUpperCase();

      if (!itemName) { errors.push(`Row skipped: no item name`); continue; }

      // Check duplicate by itemName + partNumber + brand (case-insensitive, handle empty)
      const dupQuery = { itemName: { $regex: `^${itemName}$`, $options: 'i' } };
      if (partNumber) dupQuery.partNumber = { $regex: `^${partNumber}$`, $options: 'i' };
      if (brand) dupQuery.brand = { $regex: `^${brand}$`, $options: 'i' };
      const exists = await Item.findOne(dupQuery);
      if (exists) { skipped++; continue; }

      await Item.create({ originalDescription, itemName, vehicle, brand, partNumber, unit });
      added++;
    }

    res.json({ added, skipped, errors: errors.slice(0, 20), total: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Excel - REPLACE entire master (admin)
router.post('/upload/replace', auth, allow('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

    // Delete all existing items
    await Item.deleteMany({});

    let added = 0, errors = [];
    for (const row of data) {
      const itemName = (row['ITEM NAME'] || row['Item Name'] || '').toString().trim().toUpperCase();
      const partNumber = (row['PART NUMBER'] || row['Part Number'] || '').toString().trim().toUpperCase();
      const brand = (row['BRAND/GROUP'] || row['Brand/Group'] || '').toString().trim().toUpperCase();
      const vehicle = (row['VEHICLE'] || '').toString().trim().toUpperCase();
      const unit = (row['UNIT'] || 'NOS').toString().trim().toUpperCase();
      const originalDescription = (row['ORIGINAL DESCRIPTION'] || itemName).toString().trim().toUpperCase();

      if (!itemName) continue;
      await Item.create({ originalDescription, itemName, vehicle, brand, partNumber, unit });
      added++;
    }

    res.json({ added, total: data.length, message: 'Item master replaced successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete ENTIRE item master (admin)
router.delete('/master/all', auth, allow('admin'), async (req, res) => {
  try {
    const result = await Item.deleteMany({});
    res.json({ message: 'Item master deleted', deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete item (admin)
router.delete('/:id', auth, allow('admin'), async (req, res) => {
  try {
    await Item.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Item deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update pricing (MRP + slabs) - admin
router.put('/:id/pricing', auth, allow('admin'), async (req, res) => {
  try {
    const { mrp, slabPricing } = req.body;
    const item = await Item.findByIdAndUpdate(req.params.id, { mrp, slabPricing }, { new: true });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
