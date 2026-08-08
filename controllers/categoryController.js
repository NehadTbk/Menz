const { Category, Product } = require('../models');
const { isBlank } = require('../utils/validators');

const CODE_REGEX = /^[A-Za-z0-9]{2,10}$/;

function validateCategoryInput(body) {
  const errors = [];
  const { name, code } = body;

  if (isBlank(name)) errors.push('name is required');
  if (isBlank(code)) errors.push('code is required');
  else if (!CODE_REGEX.test(String(code).trim())) {
    errors.push('code must be 2-10 alphanumeric characters (e.g. TSH)');
  }

  return errors;
}

async function list(req, res, next) {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json(categories);
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ errors: ['Category not found'] });
    return res.status(200).json(category);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const errors = validateCategoryInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const { name, code } = req.body;
    const category = await Category.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
    });

    return res.status(201).json(category);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ errors: ['Category not found'] });

    const errors = validateCategoryInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const { name, code } = req.body;
    category.name = name.trim();
    category.code = code.trim().toUpperCase();
    await category.save();

    return res.status(200).json(category);
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ errors: ['Category not found'] });

    const linkedProducts = await Product.count({ where: { category_id: category.id } });
    if (linkedProducts > 0) {
      return res.status(409).json({
        errors: ['Cannot delete a category that still has products linked to it'],
      });
    }

    await category.destroy();
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list, getOne, create, update, remove,
};
