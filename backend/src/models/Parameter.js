const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Parameters are lab test parameters (e.g. "pH", "Total Coliform Count")
// offered to customers on quotations — deliberately a separate catalog
// from Item (which is what's bought from vendors on purchase orders).
// Same shape as Item, but keeping them separate avoids conflating two
// different business concepts that just happen to look similar.
const Parameter = sequelize.define('Parameter', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  code: { type: DataTypes.STRING }, // optional short code, e.g. "PH-01"
  // Free text, not a fixed list — e.g. "Physical", "Chemical",
  // "Microbiological", "Nutritional" — so new categories can be added
  // just by typing one, without a code change.
  category: { type: DataTypes.STRING, allowNull: true },
  unit: { type: DataTypes.STRING, defaultValue: 'test' },
  unitPriceCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});

module.exports = Parameter;
