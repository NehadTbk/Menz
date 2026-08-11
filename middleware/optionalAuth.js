const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function optionalAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires'] },
    });
    if (user) req.user = user;
  } catch (err) {
    // Invalid or expired token: treat the request as unauthenticated instead of blocking it.
  }

  return next();
}

module.exports = optionalAuth;
