const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const POLineItem = sequelize.define('POLineItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  purchaseOrderId: { type: DataTypes.INTEGER, allowNull: false },
  itemId: { type: DataTypes.INTEGER, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
  unitPriceCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lineTotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  // Tracks partial fulfillment against the ordered quantity.
  quantityReceived: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = POLineItem;
