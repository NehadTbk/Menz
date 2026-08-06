module.exports = (sequelize, DataTypes) => {
  const ProductSize = sequelize.define('ProductSize', {
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0,
      },
    },
  }, {
    tableName: 'product_sizes',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['product_id', 'size_id'],
      },
    ],
  });

  return ProductSize;
};
