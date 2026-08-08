const {
  sequelize, Product, Category, Size, ProductSize,
} = require('../models');
const { isBlank } = require('../utils/validators');

function isPositiveNumber(value) {
  const n = Number(value);
  return !Number.isNaN(n) && n > 0;
}

function isNonNegativeInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
}

function validateProductInput(body) {
  const errors = [];
  const {
    category_id, name, price, sizes,
  } = body;

  if (isBlank(category_id)) errors.push('category_id is required');
  if (isBlank(name)) errors.push('name is required');
  if (isBlank(price)) errors.push('price is required');
  else if (!isPositiveNumber(price)) errors.push('price must be a positive number');

  if (sizes !== undefined) {
    if (!Array.isArray(sizes)) {
      errors.push('sizes must be an array');
    } else {
      const seen = new Set();
      sizes.forEach((entry, index) => {
        if (!entry || isBlank(entry.size_id)) {
          errors.push(`sizes[${index}].size_id is required`);
        } else if (seen.has(String(entry.size_id))) {
          errors.push(`sizes[${index}].size_id is duplicated`);
        } else {
          seen.add(String(entry.size_id));
        }
        if (!entry || isBlank(entry.stock) || !isNonNegativeInt(entry.stock)) {
          errors.push(`sizes[${index}].stock must be a non-negative integer`);
        }
      });
    }
  }

  return errors;
}

async function validateSizesExist(sizes) {
  if (!sizes || sizes.length === 0) return true;
  const sizeIds = sizes.map((s) => s.size_id);
  const foundSizes = await Size.findAll({ where: { id: sizeIds } });
  return foundSizes.length === new Set(sizeIds.map(String)).size;
}

const PRODUCT_INCLUDE = [
  { model: Category },
  { model: ProductSize, include: [Size] },
];

async function list(req, res, next) {
  try {
    const products = await Product.findAll({
      include: PRODUCT_INCLUDE,
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(products);
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id, { include: PRODUCT_INCLUDE });
    if (!product) return res.status(404).json({ errors: ['Product not found'] });
    return res.status(200).json(product);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const errors = validateProductInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const {
      category_id, name, description, price, photo, active, sizes = [],
    } = req.body;

    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(400).json({ errors: ['category_id does not reference an existing category'] });
    }

    if (!(await validateSizesExist(sizes))) {
      return res.status(400).json({ errors: ['sizes contains an unknown size_id'] });
    }

    const created = await sequelize.transaction(async (t) => {
      const code = `${category.code}-${String(category.next_product_number).padStart(4, '0')}`;

      const product = await Product.create({
        code,
        category_id: category.id,
        name,
        description,
        price,
        photo,
        active: active === undefined ? true : active,
      }, { transaction: t });

      await category.increment('next_product_number', { by: 1, transaction: t });

      if (sizes.length > 0) {
        await ProductSize.bulkCreate(
          sizes.map((s) => ({ product_id: product.id, size_id: s.size_id, stock: s.stock })),
          { transaction: t },
        );
      }

      return product;
    });

    const result = await Product.findByPk(created.id, { include: PRODUCT_INCLUDE });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ errors: ['Product not found'] });

    const errors = validateProductInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const {
      category_id, name, description, price, photo, active, sizes,
    } = req.body;

    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(400).json({ errors: ['category_id does not reference an existing category'] });
    }

    if (!(await validateSizesExist(sizes))) {
      return res.status(400).json({ errors: ['sizes contains an unknown size_id'] });
    }

    await sequelize.transaction(async (t) => {
      product.category_id = category.id;
      product.name = name;
      product.description = description;
      product.price = price;
      product.photo = photo;
      product.active = active === undefined ? product.active : active;
      await product.save({ transaction: t });

      if (sizes !== undefined) {
        await ProductSize.destroy({ where: { product_id: product.id }, transaction: t });
        if (sizes.length > 0) {
          await ProductSize.bulkCreate(
            sizes.map((s) => ({ product_id: product.id, size_id: s.size_id, stock: s.stock })),
            { transaction: t },
          );
        }
      }
    });

    const result = await Product.findByPk(product.id, { include: PRODUCT_INCLUDE });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ errors: ['Product not found'] });

    await sequelize.transaction(async (t) => {
      await ProductSize.destroy({ where: { product_id: product.id }, transaction: t });
      await product.destroy({ transaction: t });
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list, getOne, create, update, remove,
};
