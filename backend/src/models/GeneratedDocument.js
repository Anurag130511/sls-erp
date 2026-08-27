const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// One row per PDF ever generated. storageKey is a local file path by
// default, or an S3 object key when STORAGE_DRIVER=s3 (see
// services/storageService.js) — the frontend never needs to know which.
const GeneratedDocument = sequelize.define('GeneratedDocument', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  docType: { type: DataTypes.ENUM('quotation', 'purchase_order'), allowNull: false },
  documentId: { type: DataTypes.INTEGER, allowNull: false }, // FK to Quotation.id or PurchaseOrder.id
  documentNumber: { type: DataTypes.STRING, allowNull: false },
  partyName: { type: DataTypes.STRING }, // customer or vendor name, snapshotted for the list view
  storageKey: { type: DataTypes.STRING, allowNull: false },
  fileSizeBytes: { type: DataTypes.INTEGER },
}, {
  indexes: [
    // One PDF record per (docType, documentId) — regenerating overwrites
    // this row instead of creating a duplicate library entry.
    { unique: true, fields: ['docType', 'documentId'] },
  ],
});

module.exports = GeneratedDocument;
