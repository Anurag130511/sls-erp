const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// One row per PARAMETER (each gets its own Sr. No. in the PDF/detail
// table), grouped by sampleName. sampleQty/sampleCount/isCombinedPricing
// are the same across every row in a sample's group — they're sample-
// level facts, just repeated on each row here since there's no separate
// Sample table. In combined-pricing mode, the whole sample's charge
// lands on the first parameter row (chargesPerSampleCents on the rest is
// 0) and the PDF/detail page render that as one merged cell spanning
// the group; in individual mode, every row has its own charge and is
// shown separately. Every field has a defaultValue so adding this shape
// to a live database never fails on rows that predate it.
const QuotationLineItem = sequelize.define('QuotationLineItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotationId: { type: DataTypes.INTEGER, allowNull: false },
  sampleName: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  // Which sample (0, 1, 2...) this parameter belongs to, within this
  // quotation — grouping by this instead of by sampleName means two
  // samples that happen to share the same name are never merged
  // together by mistake.
  sampleIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  parameterName: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  sampleQty: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
  sampleCount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
  isCombinedPricing: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  chargesPerSampleCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lineTotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = QuotationLineItem;
