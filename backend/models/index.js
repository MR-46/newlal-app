const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── USER ────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  password: { type: String }, // internal roles
  pin: { type: String },      // external roles (retailer, end_user)
  role: {
    type: String,
    enum: ['admin', 'salesperson', 'store_staff', 'b2c_staff', 'existing_retailer', 'new_retailer', 'end_user'],
    required: true
  },
  // Retailer-specific
  shopName: String,
  city: String,
  state: String,
  pincode: String,
  address: String,
  // Status
  isActive: { type: Boolean, default: true },
  isBlacklisted: { type: Boolean, default: false },
  catalogUnlocked: { type: Boolean, default: false }, // for new_retailer
  // Security
  securityQuestion: String,
  securityAnswer: String,
  lastLogin: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password)
    this.password = await bcrypt.hash(this.password, 10);
  if (this.isModified('pin') && this.pin)
    this.pin = await bcrypt.hash(this.pin, 10);
  next();
});
userSchema.methods.comparePassword = function(p) { return bcrypt.compare(p, this.password); };
userSchema.methods.comparePin = function(p) { return bcrypt.compare(p, this.pin); };

// ─── ITEM ────────────────────────────────────────────────────────────────────
const slabSchema = new mongoose.Schema({
  label: String,       // e.g. "1-10 pcs"
  minQty: Number,
  maxQty: Number,
  price: Number
}, { _id: false });

const itemSchema = new mongoose.Schema({
  originalDescription: { type: String, required: true },
  itemName: { type: String, required: true, uppercase: true, trim: true },
  vehicle: { type: String, uppercase: true, trim: true, default: '' },
  brand: { type: String, uppercase: true, trim: true, default: '' },
  partNumber: { type: String, uppercase: true, trim: true, default: '' },
  unit: { type: String, uppercase: true, default: 'NOS' },
  mrp: { type: Number, default: null },            // end user price
  slabPricing: [slabSchema],                        // new retailer pricing
  isShowcase: { type: Boolean, default: false },    // shown to unverified retailers
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

itemSchema.index({ itemName: 'text', partNumber: 'text', brand: 'text', vehicle: 'text' });

// ─── CUSTOMER ────────────────────────────────────────────────────────────────
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, uppercase: true },
  mobile: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, uppercase: true, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // linked if existing retailer
  isActive: { type: Boolean, default: true },
  lastOrderDate: Date,
  totalOrders: { type: Number, default: 0 },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ─── ORDER ───────────────────────────────────────────────────────────────────
const orderItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  itemName: String,
  partNumber: String,
  brand: String,
  vehicle: String,
  unit: String,
  orderedQty: { type: Number, required: true },
  pickedQty: { type: Number, default: 0 },
  isChecked: { type: Boolean, default: false },
  isRestockNeeded: { type: Boolean, default: false },
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  orderType: { type: String, enum: ['b2b', 'b2c'], required: true },
  status: {
    type: String,
    enum: ['placed', 'pending_confirmation', 'confirmed', 'in_progress', 'ready', 'dispatched', 'shipped', 'delivered', 'cancelled'],
    default: 'placed'
  },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  customerMobile: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: String,
  createdByRole: String,
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedStaffName: String,
  fulfilledBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  fulfilledByNames: [String],
  items: [orderItemSchema],
  remarks: { type: String, default: '' },
  isUrgent: { type: Boolean, default: false },
  trackingNumber: { type: String, default: '' },  // b2c
  courierPartner: { type: String, default: '' },  // b2c
  paymentStatus: { type: String, enum: ['pending', 'received', 'na'], default: 'na' },
  statusHistory: [{
    status: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByName: String,
    changedAt: { type: Date, default: Date.now },
    note: String,
  }],
  deletedAt: Date,
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

orderSchema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = 'ORD' + Date.now().toString().slice(-8);
  }
  next();
});

// ─── ENQUIRY ─────────────────────────────────────────────────────────────────
const enquirySchema = new mongoose.Schema({
  enquiryId: { type: String, unique: true },
  retailer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  retailerName: String,
  shopName: String,
  mobile: String,
  city: String,
  state: String,
  pincode: String,
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    itemName: String,
    partNumber: String,
    brand: String,
    vehicle: String,
    enquiredQty: Number,
  }],
  status: { type: String, enum: ['new', 'contacted', 'converted', 'closed'], default: 'new' },
  notes: String,
  convertedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

enquirySchema.pre('save', function(next) {
  if (!this.enquiryId) this.enquiryId = 'ENQ' + Date.now().toString().slice(-8);
  next();
});

// ─── ANNOUNCEMENT ────────────────────────────────────────────────────────────
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetRoles: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ─── AUDIT LOG ───────────────────────────────────────────────────────────────
const auditSchema = new mongoose.Schema({
  action: String,
  entity: String,
  entityId: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: String,
  performedByRole: String,
  details: mongoose.Schema.Types.Mixed,
  ip: String,
}, { timestamps: true });

// ─── VISIT ───────────────────────────────────────────────────────────────────
const visitSchema = new mongoose.Schema({
  salesperson: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: String,
  scheduledDate: { type: Date, required: true },
  notes: String,
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,
}, { timestamps: true });

// ─── ACCOUNT STATEMENT ───────────────────────────────────────────────────────
const paymentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  type: { type: String, enum: ['debit', 'credit'], required: true },
  amount: { type: Number, required: true },
  method: String,
  reference: String,
  note: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByName: String,
}, { timestamps: true });

// ─── WISHLIST ─────────────────────────────────────────────────────────────────
const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
}, { timestamps: true });

wishlistSchema.index({ user: 1, item: 1 }, { unique: true });

module.exports = {
  User: mongoose.model('User', userSchema),
  Item: mongoose.model('Item', itemSchema),
  Customer: mongoose.model('Customer', customerSchema),
  Order: mongoose.model('Order', orderSchema),
  Enquiry: mongoose.model('Enquiry', enquirySchema),
  Announcement: mongoose.model('Announcement', announcementSchema),
  Audit: mongoose.model('Audit', auditSchema),
  Visit: mongoose.model('Visit', visitSchema),
  Payment: mongoose.model('Payment', paymentSchema),
  Wishlist: mongoose.model('Wishlist', wishlistSchema),
};
