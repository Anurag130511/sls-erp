const bcrypt = require('bcryptjs');
const { User } = require('../models');

const SAFE_ATTRS = ['id', 'name', 'email', 'designation', 'role', 'createdAt'];

const list = async (req, res) => {
  const users = await User.findAll({ attributes: SAFE_ATTRS, order: [['name', 'ASC']] });
  res.json(users);
};

const create = async (req, res) => {
  const { name, email, password, role, designation } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: 'A user with that email already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: role || 'manager', designation: designation || null });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, designation: user.designation, role: user.role });
};

const update = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, role, password, designation } = req.body;
  const patch = {};
  if (name) patch.name = name;
  if (role) patch.role = role;
  if (designation !== undefined) patch.designation = designation;
  if (password) patch.passwordHash = await bcrypt.hash(password, 10);

  // Don't allow demoting the last remaining admin — that would lock
  // everyone out of user management.
  if (role && role !== 'admin' && user.role === 'admin') {
    const adminCount = await User.count({ where: { role: 'admin' } });
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin account' });
    }
  }

  await user.update(patch);
  res.json({ id: user.id, name: user.name, email: user.email, designation: user.designation, role: user.role });
};

const remove = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.user.id === user.id) {
    return res.status(400).json({ error: "You can't delete your own account while logged in as it" });
  }
  if (user.role === 'admin') {
    const adminCount = await User.count({ where: { role: 'admin' } });
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin account' });
    }
  }

  await user.destroy();
  res.status(204).send();
};

module.exports = { list, create, update, remove };
