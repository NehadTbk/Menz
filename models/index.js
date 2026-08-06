const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = require('./user')(sequelize, DataTypes);
const Category = require('./category')(sequelize, DataTypes);
const Size = require('./size')(sequelize, DataTypes);
const Product = require('./product')(sequelize, DataTypes);
const ProductSize = require('./productSize')(sequelize, DataTypes);
const Order = require('./order')(sequelize, DataTypes);
const OrderItem = require('./orderItem')(sequelize, DataTypes);

User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id' });

Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });

Product.belongsToMany(Size, { through: ProductSize, foreignKey: 'product_id' });
Size.belongsToMany(Product, { through: ProductSize, foreignKey: 'size_id' });
Product.hasMany(ProductSize, { foreignKey: 'product_id' });
ProductSize.belongsTo(Product, { foreignKey: 'product_id' });
Size.hasMany(ProductSize, { foreignKey: 'size_id' });
ProductSize.belongsTo(Size, { foreignKey: 'size_id' });

Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
Product.hasMany(OrderItem, { foreignKey: 'product_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });
Size.hasMany(OrderItem, { foreignKey: 'size_id' });
OrderItem.belongsTo(Size, { foreignKey: 'size_id' });

module.exports = {
  sequelize,
  User,
  Category,
  Size,
  Product,
  ProductSize,
  Order,
  OrderItem,
};
