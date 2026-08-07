function requireRole(...roles) {
  return function role(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ errors: ['Authentication required'] });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ errors: ['Insufficient permissions'] });
    }

    return next();
  };
}

module.exports = requireRole;
