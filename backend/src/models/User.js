const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  designation: { type: DataTypes.STRING, allowNull: true }, // e.g. "Sales Executive", "Lab Manager"
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'viewer'),
    defaultValue: 'manager',
  },
});

module.exports = User;
