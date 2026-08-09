const {
  sequelize, Order, OrderItem, Product, ProductSize, Size,
} = require('../models');
const { isBlank, isValidPostalCode } = require('../utils/validators');

const SHIPPING_COST = Number(process.env.SHIPPING_COST) || 4.95;
const DELIVERY_TYPES = ['pickup', 'shipping'];
const ORDER_STATUSES = ['new', 'processed', 'completed'];

class OrderError extends Error {}

function isPositiveInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1;
}

function validateOrderInput(body) {
  const errors = [];
  const {
    delivery_type, street, house_number, postal_code, city, items,
  } = body;

  if (isBlank(delivery_type) || !DELIVERY_TYPES.includes(delivery_type)) {
    errors.push('delivery_type must be either "pickup" or "shipping"');
  }

  if (delivery_type === 'shipping') {
    if (isBlank(street)) errors.push('street is required for shipping orders');
    if (isBlank(house_number)) errors.push('house_number is required for shipping orders');
    if (isBlank(postal_code)) errors.push('postal_code is required for shipping orders');
    else if (!isValidPostalCode(postal_code)) errors.push('postal_code must be exactly 4 digits');
    if (isBlank(city)) errors.push('city is required for shipping orders');
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('items must be a non-empty array');
  } else {
    items.forEach((item, index) => {
      if (!item || isBlank(item.product_id)) errors.push(`items[${index}].product_id is required`);
      if (!item || isBlank(item.size_id)) errors.push(`items[${index}].size_id is required`);
      if (!item || isBlank(item.quantity) || !isPositiveInteger(item.quantity)) {
        errors.push(`items[${index}].quantity must be a positive integer`);
      }
    });
  }

  return errors;
}

const ORDER_INCLUDE = [
  {
    model: OrderItem,
    include: [Product, Size],
  },
];

async function create(req, res, next) {
  try {
    const errors = validateOrderInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const {
      delivery_type, street, house_number, postal_code, city, items,
    } = req.body;

    const createdOrder = await sequelize.transaction(async (t) => {
      let productsSubtotal = 0;
      const orderItemsData = [];

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];

        const product = await Product.findByPk(item.product_id, { transaction: t });
        if (!product || !product.active) {
          throw new OrderError(`items[${index}]: product is not available`);
        }

        const productSize = await ProductSize.findOne({
          where: { product_id: item.product_id, size_id: item.size_id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        const quantity = Number(item.quantity);
        const availableStock = productSize ? productSize.stock : 0;
        if (availableStock < quantity) {
          throw new OrderError(`items[${index}]: insufficient stock for ${product.code} (requested ${quantity}, available ${availableStock})`);
        }

        productSize.stock -= quantity;
        await productSize.save({ transaction: t });

        productsSubtotal += Number(product.price) * quantity;
        orderItemsData.push({
          product_id: product.id,
          size_id: item.size_id,
          quantity,
          price_at_order_time: product.price,
        });
      }

      const total = productsSubtotal + (delivery_type === 'shipping' ? SHIPPING_COST : 0);

      const order = await Order.create({
        user_id: req.user.id,
        status: 'new',
        delivery_type,
        street: delivery_type === 'shipping' ? street : null,
        house_number: delivery_type === 'shipping' ? house_number : null,
        postal_code: delivery_type === 'shipping' ? postal_code : null,
        city: delivery_type === 'shipping' ? city : null,
        total,
      }, { transaction: t });

      await OrderItem.bulkCreate(
        orderItemsData.map((item) => ({ ...item, order_id: order.id })),
        { transaction: t },
      );

      return order;
    });

    const result = await Order.findByPk(createdOrder.id, { include: ORDER_INCLUDE });
    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof OrderError) {
      return res.status(409).json({ errors: [err.message] });
    }
    return next(err);
  }
}

function isAdminRequest(req) {
  return Boolean(req.user && req.user.role === 'admin');
}

async function list(req, res, next) {
  try {
    const { status } = req.query;
    if (!isBlank(status) && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ errors: [`status must be one of ${ORDER_STATUSES.join(', ')}`] });
    }

    const where = {};
    if (!isAdminRequest(req)) where.user_id = req.user.id;
    if (!isBlank(status)) where.status = status;

    const orders = await Order.findAll({
      where,
      include: ORDER_INCLUDE,
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(orders);
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const order = await Order.findByPk(req.params.id, { include: ORDER_INCLUDE });
    if (!order) return res.status(404).json({ errors: ['Order not found'] });

    if (!isAdminRequest(req) && order.user_id !== req.user.id) {
      return res.status(404).json({ errors: ['Order not found'] });
    }

    return res.status(200).json(order);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create, list, getOne,
};
