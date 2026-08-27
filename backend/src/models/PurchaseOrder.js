const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Status lifecycle: draft -> sent -> confirmed -> partially_received | received -> closed
// "cancelled" is reachable from any pre-closed state (enforced in the controller).
const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  poNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  vendorId: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM(
      'draft', 'sent', 'confirmed', 'partially_received', 'received', 'closed', 'cancelled'
    ),
    defaultValue: 'draft',
  },
  issueDate: { type: DataTypes.DATEONLY, allowNull: false },
  expectedDeliveryDate: { type: DataTypes.DATEONLY },
  // Optional link back to the quotation this PO was raised to fulfill.
  sourceQuotationId: { type: DataTypes.INTEGER, allowNull: true },
  // Snapshot pattern, same as on Quotation — see that model's comment.
  createdById: { type: DataTypes.INTEGER, allowNull: true },
  createdByName: { type: DataTypes.STRING, allowNull: true },
  createdByDesignation: { type: DataTypes.STRING, allowNull: true },
  subtotalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  gstPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  gstCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  totalCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  terms: { type: DataTypes.TEXT },
});

module.exports = PurchaseOrder;
