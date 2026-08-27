const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// description/unitPrice are snapshotted at creation time (not live-joined
// to Parameter) so historical quotations stay accurate if catalog prices
// change later. "description" holds the sample name for this lab's use.
const QuotationLineItem = sequelize.define('QuotationLineItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotationId: { type: DataTypes.INTEGER, allowNull: false },
  parameterId: { type: DataTypes.INTEGER, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
  unitPriceCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  discountCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lineTotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = QuotationLineItem;
