const { Item } = require('../models');
const { toCents } = require('../utils/money');

const list = async (req, res) => {
  const items = await Item.findAll({ order: [['name', 'ASC']] });
  res.json(items);
};

const get = async (req, res) => {
  const item = await Item.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
};

const create = async (req, res) => {
  const { unitPrice, ...rest } = req.body;
  const item = await Item.create({ ...rest, unitPriceCents: toCents(unitPrice || 0) });
  res.status(201).json(item);
};

const update = async (req, res) => {
  const item = await Item.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const { unitPrice, ...rest } = req.body;
  const patch = { ...rest };
  if (unitPrice !== undefined) patch.unitPriceCents = toCents(unitPrice);
  await item.update(patch);
  res.json(item);
};

const remove = async (req, res) => {
  const item = await Item.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  await item.destroy();
  res.status(204).send();
};

module.exports = { list, get, create, update, remove };
