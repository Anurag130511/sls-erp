const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Item = sequelize.define('Item', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  sku: { type: DataTypes.STRING },
  unit: { type: DataTypes.STRING, defaultValue: 'unit' },
  // Stored in the smallest currency unit (paise) to avoid float rounding errors.
  unitPriceCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});

module.exports = Item;
