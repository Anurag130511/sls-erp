const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// One row per PARAMETER (each gets its own Sr. No. in the PDF/detail
// table). sampleIndex groups rows into samples; pricingGroupIndex
// further groups rows WITHIN a sample into price blocks — a sample can
// mix individually-priced parameters with parameters that share one
// combined price, all at once (e.g. "256 pesticides" priced on its own,
// while "physical & Chemical" and "Heavy metals" share one combined
// price, all under the same "rice" sample). sampleQty/sampleCount are
// sample-level facts (same across every row in a sample); a pricing
// group's charge lands on its first row (chargesPerSampleCents on the
// rest of that group is 0), and isCombinedPricing flags whether that
// group has more than one parameter, telling the PDF/detail page to
// render it as one merged cell spanning the group vs. a normal single
// row. Every field has a defaultValue so adding this shape to a live
// database never fails on rows that predate it.
const QuotationLineItem = sequelize.define('QuotationLineItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotationId: { type: DataTypes.INTEGER, allowNull: false },
  sampleName: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  // Which sample (0, 1, 2...) this parameter belongs to, within this
  // quotation — grouping by this instead of by sampleName means two
  // samples that happen to share the same name are never merged
  // together by mistake.
  sampleIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  // Which price group (0, 1, 2...) within its sample this row belongs
  // to — several consecutive parameters can share one pricing group
  // (combined price) while others in the same sample stand alone.
  pricingGroupIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  parameterName: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  sampleQty: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
  sampleCount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
  isCombinedPricing: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  chargesPerSampleCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lineTotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = QuotationLineItem;
