const { Size } = require('../models');

async function list(req, res, next) {
  try {
    const sizes = await Size.findAll({ order: [['id', 'ASC']] });
    return res.status(200).json(sizes);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list };
