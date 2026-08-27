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

// Quotation <-> LineItems <-> Parameter (lab test parameters — separate
// catalog from Item, which is what purchase orders buy from vendors).
Quotation.hasMany(QuotationLineItem, { foreignKey: 'quotationId', as: 'lineItems', onDelete: 'CASCADE' });
QuotationLineItem.belongsTo(Quotation, { foreignKey: 'quotationId' });
QuotationLineItem.belongsTo(Parameter, { foreignKey: 'parameterId', as: 'parameter' });

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
