const { Parameter } = require('../models');
const { toCents } = require('../utils/money');

const list = async (req, res) => {
  const parameters = await Parameter.findAll({ order: [['name', 'ASC']] });
  res.json(parameters);
};

const get = async (req, res) => {
  const parameter = await Parameter.findByPk(req.params.id);
  if (!parameter) return res.status(404).json({ error: 'Parameter not found' });
  res.json(parameter);
};

const create = async (req, res) => {
  const { unitPrice, ...rest } = req.body;
  const parameter = await Parameter.create({ ...rest, unitPriceCents: toCents(unitPrice || 0) });
  res.status(201).json(parameter);
};

const update = async (req, res) => {
  const parameter = await Parameter.findByPk(req.params.id);
  if (!parameter) return res.status(404).json({ error: 'Parameter not found' });
  const { unitPrice, ...rest } = req.body;
  const patch = { ...rest };
  if (unitPrice !== undefined) patch.unitPriceCents = toCents(unitPrice);
  await parameter.update(patch);
  res.json(parameter);
};

const remove = async (req, res) => {
  const parameter = await Parameter.findByPk(req.params.id);
  if (!parameter) return res.status(404).json({ error: 'Parameter not found' });
  await parameter.destroy();
  res.status(204).send();
};

module.exports = { list, get, create, update, remove };
