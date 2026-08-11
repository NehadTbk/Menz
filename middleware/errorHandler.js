module.exports = (err, req, res, next) => {
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ errors: err.errors.map((e) => e.message) });
  }

  if (err.name === 'MulterError' || err.message.includes('Only JPEG, PNG, WEBP, or GIF')) {
    return res.status(400).json({ errors: [err.message] });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ errors: ['Invalid JSON in request body'] });
  }

  console.error(err);
  res.status(500).json({ errors: ['Internal server error'] });
};
