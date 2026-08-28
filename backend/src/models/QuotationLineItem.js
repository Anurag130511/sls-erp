const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Each row is one (sample, parameter) pairing — sampleName is repeated
// across every parameter tested for the same sample, so a quotation's
// lines can be grouped back into "Sample A: pH, TDS / Sample B: pH" for
// display. "description" holds the parameter's own name/description.
// quantity stays at 1 (tests aren't ordered in bulk) and discountCents
// stays 0 per line — discount is applied once, at the quotation level,
// not per parameter. Both snapshotted at creation time so historical
// quotations stay accurate if catalog prices change later.
const QuotationLineItem = sequelize.define('QuotationLineItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotationId: { type: DataTypes.INTEGER, allowNull: false },
  parameterId: { type: DataTypes.INTEGER, allowNull: true },
  // defaultValue lets Postgres backfill this onto any pre-existing rows
  // when the column is first added to a live database (without it, an
  // ALTER TABLE ... NOT NULL on a table that already has rows fails
  // outright, since Postgres has nothing to put in the new column for
  // them). The app always sets a real value explicitly on every new row,
  // so this default is really just a one-time migration safety net.
  sampleName: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  description: { type: DataTypes.TEXT, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
  unitPriceCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  discountCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lineTotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = QuotationLineItem;
