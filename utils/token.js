const jwt = require('jsonwebtoken');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDaysToMs(value) {
  const days = parseInt(value, 10);
  return days * MS_PER_DAY;
}

function generateToken(payload, rememberMe) {
  const expiresIn = rememberMe ? process.env.JWT_REMEMBER_EXPIRES_IN : process.env.JWT_EXPIRES_IN;
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  const maxAge = parseDaysToMs(expiresIn);
  return { token, maxAge };
}

module.exports = { generateToken };
