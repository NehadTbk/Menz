const crypto = require('crypto');

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  return {
    rawToken,
    hashedToken: hashResetToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
  };
}

module.exports = { generateResetToken, hashResetToken };
