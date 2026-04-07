const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -pin');
    if (!user || !user.isActive || user.isBlacklisted)
      return res.status(401).json({ error: 'Unauthorized' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: 'Access denied' });
  next();
};

const auditLog = (action, entity) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode < 400 && req.user) {
      try {
        const { Audit } = require('../models');
        await Audit.create({
          action,
          entity,
          entityId: req.params.id || res.locals.entityId,
          performedBy: req.user._id,
          performedByName: req.user.name,
          performedByRole: req.user.role,
          details: { body: req.body, params: req.params },
          ip: req.ip,
        });
      } catch {}
    }
  });
  next();
};

module.exports = { auth, allow, auditLog };
