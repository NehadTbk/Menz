module.exports = (sequelize, DataTypes) => {
  const Size = sequelize.define('Size', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
  }, {
    tableName: 'sizes',
    underscored: true,
  });

  return Size;
};
