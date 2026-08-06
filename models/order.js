module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    status: {
      type: DataTypes.ENUM('new', 'processed', 'completed'),
      allowNull: false,
      defaultValue: 'new',
    },
    delivery_type: {
      type: DataTypes.ENUM('pickup', 'shipping'),
      allowNull: false,
    },
    street: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    house_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    postal_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0,
      },
    },
  }, {
    tableName: 'orders',
    underscored: true,
  });

  return Order;
};
