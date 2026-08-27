const { Customer } = require('../models');

const list = async (req, res) => {
  const customers = await Customer.findAll({ order: [['name', 'ASC']] });
  res.json(customers);
};

const get = async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
};

const create = async (req, res) => {
  const customer = await Customer.create(req.body);
  res.status(201).json(customer);
};

const update = async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  await customer.update(req.body);
  res.json(customer);
};

const remove = async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  await customer.destroy();
  res.status(204).send();
};

module.exports = { list, get, create, update, remove };
