const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// One row per document type per financial year, e.g. key = "PO-2026-27".
// Incremented inside a transaction (see utils/numbering.js) so concurrent
// requests never hand out the same number — never derive numbers from
// MAX(id)+1, which races under concurrent requests.
const Counter = sequelize.define('Counter', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});

module.exports = Counter;
