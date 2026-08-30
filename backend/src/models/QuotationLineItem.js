const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Matches the lab's real quotation format: one row per SAMPLE (not per
// parameter). "parametersText" lists every parameter tested for that
// sample as a single display string (e.g. "pH, TDS, Total Coliform"),
// since pricing is always per-sample here — Charges/Sample × Sample Qty
// × Sample Count = Total. Every field below has a defaultValue so adding
// them to a live database (via alter:true) never fails on existing rows
// that predate this shape — see the "sampleName" migration note this
// pattern replaced.
const QuotationLineItem = sequelize.define('QuotationLineItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotationId: { type: DataTypes.INTEGER, allowNull: false },
  sampleName: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  parametersText: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  sampleQty: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
  chargesPerSampleCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  sampleCount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
  lineTotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = QuotationLineItem;
