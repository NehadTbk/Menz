const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function auth(req, res, next) {
  const token = req.cookies && req.cookies.token;

  if (!token) {
    return res.status(401).json({ errors: ['Authentication required'] });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires'] },
    });

    if (!user) {
      return res.status(401).json({ errors: ['Authentication required'] });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ errors: ['Invalid or expired session'] });
  }
}

module.exports = auth;
