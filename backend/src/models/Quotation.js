const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Status lifecycle: draft -> sent -> accepted | rejected | expired
// "accepted" quotations are treated as locked in the controller layer.
const Quotation = sequelize.define('Quotation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotationNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  customerId: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'accepted', 'rejected', 'expired'),
    defaultValue: 'draft',
  },
  issueDate: { type: DataTypes.DATEONLY, allowNull: false },
  expiryDate: { type: DataTypes.DATEONLY },
  subject: { type: DataTypes.STRING, allowNull: true }, // the "Sub." line on the quotation letter
  // createdById links to the live User record (nullable — if that user's
  // login is later removed, the FK goes null via onDelete: SET NULL, see
  // models/index.js). salesPersonName is a snapshot taken at creation
  // time so the name still displays correctly even after that happens —
  // same "snapshot for history" principle used for line item prices.
  createdById: { type: DataTypes.INTEGER, allowNull: true },
  salesPersonName: { type: DataTypes.STRING, allowNull: true },
  salesPersonDesignation: { type: DataTypes.STRING, allowNull: true },
  salesPersonContactNo: { type: DataTypes.STRING, allowNull: true },
  subtotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  // Discount is entered as a percentage; discountCents is always derived
  // (subtotal x discountPercent / 100) and stored alongside it purely so
  // the PDF/detail page/reports can keep showing a rupee figure without
  // recomputing it from scratch every time.
  discountPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  discountCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  // GST is optional per quotation — gstApplicable toggles whether it's
  // charged at all; gstPercent defaults to 18% (the standard rate this
  // lab uses) but stays editable in the database in case that ever changes.
  gstApplicable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  gstPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 18 },
  gstCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  totalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  terms: { type: DataTypes.TEXT },
  // Revisions: revising a quotation creates a new draft Quotation row
  // (copying customer/samples/discount/GST/etc.) rather than editing the
  // original in place — so a quotation the customer already has a copy
  // of never silently changes. revisionOfId points to the immediate
  // quotation it was revised from (null for an original); revisionNumber
  // is 0 for an original, 1/2/3... for successive revisions.
  revisionOfId: { type: DataTypes.INTEGER, allowNull: true },
  revisionNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});

module.exports = Quotation;
