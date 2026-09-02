const sequelize = require('../config/database');
const User = require('./User');
const Customer = require('./Customer');
const Vendor = require('./Vendor');
const Item = require('./Item');
const Parameter = require('./Parameter');
const Quotation = require('./Quotation');
const QuotationLineItem = require('./QuotationLineItem');
const PurchaseOrder = require('./PurchaseOrder');
const POLineItem = require('./POLineItem');
const Counter = require('./Counter');
const GeneratedDocument = require('./GeneratedDocument');

// Quotation <-> Customer
Quotation.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Quotation, { foreignKey: 'customerId' });

// Quotation <-> LineItems (one row per sample — see QuotationLineItem's
// own comment). Parameter is still a standalone catalog (used by the
// quotation form and auto-save-on-typing), but no longer FK-linked from
// line items now that pricing/display is per-sample, not per-parameter.
Quotation.hasMany(QuotationLineItem, { foreignKey: 'quotationId', as: 'lineItems', onDelete: 'CASCADE' });
QuotationLineItem.belongsTo(Quotation, { foreignKey: 'quotationId' });

// PurchaseOrder <-> Vendor
PurchaseOrder.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
Vendor.hasMany(PurchaseOrder, { foreignKey: 'vendorId' });

// PurchaseOrder <-> LineItems <-> Item (materials/reagents bought from vendors)
PurchaseOrder.hasMany(POLineItem, { foreignKey: 'purchaseOrderId', as: 'lineItems', onDelete: 'CASCADE' });
POLineItem.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });
POLineItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

// PurchaseOrder <-> source Quotation (optional link)
PurchaseOrder.belongsTo(Quotation, { foreignKey: 'sourceQuotationId', as: 'sourceQuotation' });

// Quotation / PurchaseOrder <-> the User who created them. onDelete: SET
// NULL means removing a user's login later doesn't delete or orphan their
// past documents — createdById just goes null, and salesPersonName /
// createdByName (snapshotted at creation time) still show who it was.
Quotation.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy', onDelete: 'SET NULL' });
User.hasMany(Quotation, { foreignKey: 'createdById' });

PurchaseOrder.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy', onDelete: 'SET NULL' });
User.hasMany(PurchaseOrder, { foreignKey: 'createdById' });

// Quotation <-> the quotation it was revised from (self-referencing).
Quotation.belongsTo(Quotation, { foreignKey: 'revisionOfId', as: 'revisionOf' });
Quotation.hasMany(Quotation, { foreignKey: 'revisionOfId', as: 'revisions' });

module.exports = {
  sequelize,
  User,
  Customer,
  Vendor,
  Item,
  Parameter,
  Quotation,
  QuotationLineItem,
  PurchaseOrder,
  POLineItem,
  Counter,
  GeneratedDocument,
};
