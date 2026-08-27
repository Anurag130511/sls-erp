const { Vendor } = require('../models');

const list = async (req, res) => {
  const vendors = await Vendor.findAll({ order: [['name', 'ASC']] });
  res.json(vendors);
};

const get = async (req, res) => {
  const vendor = await Vendor.findByPk(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  res.json(vendor);
};

const create = async (req, res) => {
  const vendor = await Vendor.create(req.body);
  res.status(201).json(vendor);
};

const update = async (req, res) => {
  const vendor = await Vendor.findByPk(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  await vendor.update(req.body);
  res.json(vendor);
};

const remove = async (req, res) => {
  const vendor = await Vendor.findByPk(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  await vendor.destroy();
  res.status(204).send();
};

module.exports = { list, get, create, update, remove };
