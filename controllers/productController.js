const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  sequelize, Product, Category, Size, ProductSize,
} = require('../models');
const { isBlank } = require('../utils/validators');
const { UPLOADS_DIR } = require('../utils/upload');

function isPositiveNumber(value) {
  const n = Number(value);
  return !Number.isNaN(n) && n > 0;
}

function isNonNegativeInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
}

const SORT_FIELDS = {
  price: 'price',
  name: 'name',
  code: 'code',
  created_at: 'createdAt',
};

function parseSort(sort) {
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  const column = SORT_FIELDS[key];
  if (!column) return null;
  return [[column, desc ? 'DESC' : 'ASC']];
}

function parseMultipartBody(body) {
  let { sizes } = body;
  if (typeof sizes === 'string') {
    try {
      sizes = JSON.parse(sizes);
    } catch (err) {
      sizes = null;
    }
  }

  let { active } = body;
  if (typeof active === 'string') active = active === 'true';

  return {
    category_id: body.category_id,
    name: body.name,
    description: body.description,
    price: body.price,
    active,
    sizes,
  };
}

function validateProductInput({
  category_id, name, price, sizes,
}) {
  const errors = [];

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

function cleanupUploadedFile(req) {
  if (req.file) fs.unlink(req.file.path, () => {});
}

function deleteStoredPhoto(photoPath) {
  if (!photoPath || !photoPath.startsWith('/uploads/')) return;
  fs.unlink(path.join(UPLOADS_DIR, path.basename(photoPath)), () => {});
}

const PRODUCT_INCLUDE = [
  { model: Category },
  { model: ProductSize, include: [Size] },
];

function isAdminRequest(req) {
  return Boolean(req.user && req.user.role === 'admin');
}

async function list(req, res, next) {
  try {
    const {
      category_id, code, limit, offset, sort,
    } = req.query;
    const where = {};

    if (!isAdminRequest(req)) where.active = true;
    if (!isBlank(category_id)) where.category_id = category_id;
    if (!isBlank(code)) where.code = { [Op.like]: `%${code}%` };

    let order = [['createdAt', 'DESC']];
    if (!isBlank(sort)) {
      const parsedSort = parseSort(sort);
      if (!parsedSort) {
        const allowed = Object.keys(SORT_FIELDS).flatMap((key) => [key, `-${key}`]);
        return res.status(400).json({ errors: [`sort must be one of: ${allowed.join(', ')}`] });
      }
      order = parsedSort;
    }

    const queryOptions = {
      where,
      include: PRODUCT_INCLUDE,
      order,
    };

    if (!isBlank(limit)) queryOptions.limit = Math.max(0, parseInt(limit, 10) || 0);
    if (!isBlank(offset)) queryOptions.offset = Math.max(0, parseInt(offset, 10) || 0);

    const products = await Product.findAll(queryOptions);
    return res.status(200).json(products);
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id, { include: PRODUCT_INCLUDE });
    if (!product) return res.status(404).json({ errors: ['Product not found'] });

    if (!product.active && !isAdminRequest(req)) {
      return res.status(404).json({ errors: ['Product not found'] });
    }

    return res.status(200).json(product);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      category_id, name, description, price, active, sizes,
    } = parseMultipartBody(req.body);

    const errors = validateProductInput({
      category_id, name, price, sizes,
    });
    if (errors.length > 0) {
      cleanupUploadedFile(req);
      return res.status(400).json({ errors });
    }

    const category = await Category.findByPk(category_id);
    if (!category) {
      cleanupUploadedFile(req);
      return res.status(400).json({ errors: ['category_id does not reference an existing category'] });
    }

    if (!(await validateSizesExist(sizes))) {
      cleanupUploadedFile(req);
      return res.status(400).json({ errors: ['sizes contains an unknown size_id'] });
    }

    const photo = req.file ? `/uploads/${req.file.filename}` : null;

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

      if (sizes && sizes.length > 0) {
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
    cleanupUploadedFile(req);
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      cleanupUploadedFile(req);
      return res.status(404).json({ errors: ['Product not found'] });
    }

    const {
      category_id, name, description, price, active, sizes,
    } = parseMultipartBody(req.body);

    const errors = validateProductInput({
      category_id, name, price, sizes,
    });
    if (errors.length > 0) {
      cleanupUploadedFile(req);
      return res.status(400).json({ errors });
    }

    const category = await Category.findByPk(category_id);
    if (!category) {
      cleanupUploadedFile(req);
      return res.status(400).json({ errors: ['category_id does not reference an existing category'] });
    }

    if (!(await validateSizesExist(sizes))) {
      cleanupUploadedFile(req);
      return res.status(400).json({ errors: ['sizes contains an unknown size_id'] });
    }

    const previousPhoto = product.photo;
    const photo = req.file ? `/uploads/${req.file.filename}` : product.photo;

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

    if (req.file && previousPhoto) {
      deleteStoredPhoto(previousPhoto);
    }

    const result = await Product.findByPk(product.id, { include: PRODUCT_INCLUDE });
    return res.status(200).json(result);
  } catch (err) {
    cleanupUploadedFile(req);
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

    deleteStoredPhoto(product.photo);

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list, getOne, create, update, remove,
};
