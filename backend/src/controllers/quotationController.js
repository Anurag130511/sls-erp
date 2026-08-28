const { sequelize, Quotation, QuotationLineItem, Customer, User, Parameter } = require('../models');
const { nextQuotationNumber } = require('../utils/numbering');
const { canTransitionQuotation } = require('../utils/statusTransitions');
const { toCents } = require('../utils/money');

const INCLUDE = [
  { model: Customer, as: 'customer' },
  { model: QuotationLineItem, as: 'lineItems' },
  { model: User, as: 'createdBy', attributes: ['id', 'name', 'email', 'designation'] },
];

/**
 * Flattens the nested samples->parameters structure the form sends into
 * QuotationLineItem rows, and — for any parameter typed freely rather
 * than picked from the catalog — creates it in the Parameter catalog so
 * it's available to pick next time. Matching is by exact name (case-
 * insensitive) so re-typing an existing parameter's name reuses it
 * instead of creating a duplicate.
 */
async function flattenSamplesAndSaveNewParameters(samples, t) {
  const lines = [];
  let sortOrder = 0;

  for (const sample of samples) {
    const sampleName = (sample.sampleName || '').trim();
    for (const param of sample.parameters) {
      const description = (param.description || '').trim();
      const unitPriceCents = toCents(param.unitPrice || 0);
      let parameterId = param.parameterId || null;

      if (!parameterId && description) {
        let existing = await Parameter.findOne({
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), description.toLowerCase()),
          transaction: t,
        });
        if (!existing) {
          existing = await Parameter.create(
            { name: description, unitPriceCents, unit: 'test' },
            { transaction: t }
          );
        }
        parameterId = existing.id;
      }

      lines.push({
        parameterId,
        sampleName,
        description,
        quantity: 1,
        unitPriceCents,
        discountCents: 0,
        lineTotalCents: unitPriceCents,
        sortOrder: sortOrder++,
      });
    }
  }

  return lines;
}

function computeTotalsFromLines(lines, discountCents, gstApplicable, gstPercent) {
  const subtotalCents = lines.reduce((sum, li) => sum + li.lineTotalCents, 0);
  const preTaxTotalCents = subtotalCents - discountCents;
  const gstCents = gstApplicable ? Math.round((preTaxTotalCents * Number(gstPercent || 18)) / 100) : 0;
  const totalCents = preTaxTotalCents + gstCents;
  return { subtotalCents, gstCents, totalCents };
}

const list = async (req, res) => {
  const { status, customerId, userId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (userId) where.createdById = userId;
  const quotations = await Quotation.findAll({ where, include: INCLUDE, order: [['issueDate', 'DESC']] });
  res.json(quotations);
};

const get = async (req, res) => {
  const quotation = await Quotation.findByPk(req.params.id, { include: INCLUDE });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  res.json(quotation);
};

const create = async (req, res) => {
  const { customerId, issueDate, expiryDate, notes, terms, samples, discount, gstApplicable, gstPercent } = req.body;

  if (!customerId || !issueDate || !Array.isArray(samples) || samples.length === 0) {
    return res.status(400).json({ error: 'customerId, issueDate and at least one sample are required' });
  }
  for (const s of samples) {
    if (!s.sampleName || !Array.isArray(s.parameters) || s.parameters.length === 0) {
      return res.status(400).json({ error: 'Every sample needs a name and at least one parameter' });
    }
  }

  const result = await sequelize.transaction(async (t) => {
    const quotationNumber = await nextQuotationNumber();
    const lines = await flattenSamplesAndSaveNewParameters(samples, t);
    const discountCents = toCents(discount || 0);
    const { subtotalCents, gstCents, totalCents } = computeTotalsFromLines(
      lines, discountCents, Boolean(gstApplicable), gstPercent || 18
    );

    const quotation = await Quotation.create(
      {
        quotationNumber,
        customerId,
        issueDate,
        expiryDate,
        notes,
        terms,
        status: 'draft',
        subtotalCents,
        discountCents,
        gstApplicable: Boolean(gstApplicable),
        gstPercent: gstPercent || 18,
        gstCents,
        totalCents,
        createdById: req.user.id,
        salesPersonName: req.user.name,
        salesPersonDesignation: req.user.designation || null,
      },
      { transaction: t }
    );

    await QuotationLineItem.bulkCreate(
      lines.map((li) => ({ ...li, quotationId: quotation.id })),
      { transaction: t }
    );

    return quotation.id;
  });

  const created = await Quotation.findByPk(result, { include: INCLUDE });
  res.status(201).json(created);
};

// Editing is only allowed while a quotation is in draft — once sent/accepted,
// customers may be holding a copy, so the document should not silently change.
const update = async (req, res) => {
  const quotation = await Quotation.findByPk(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  if (quotation.status !== 'draft') {
    return res.status(400).json({ error: `Cannot edit a quotation in "${quotation.status}" status` });
  }

  const { customerId, issueDate, expiryDate, notes, terms, samples, discount, gstApplicable, gstPercent } = req.body;

  await sequelize.transaction(async (t) => {
    const patch = { customerId, issueDate, expiryDate, notes, terms };
    const nextGstApplicable = gstApplicable !== undefined ? Boolean(gstApplicable) : quotation.gstApplicable;
    const nextGstPercent = gstPercent !== undefined ? gstPercent : quotation.gstPercent;
    const nextDiscountCents = discount !== undefined ? toCents(discount) : quotation.discountCents;

    if (Array.isArray(samples) && samples.length > 0) {
      const lines = await flattenSamplesAndSaveNewParameters(samples, t);
      const { subtotalCents, gstCents, totalCents } = computeTotalsFromLines(
        lines, nextDiscountCents, nextGstApplicable, nextGstPercent
      );
      Object.assign(patch, {
        subtotalCents,
        discountCents: nextDiscountCents,
        gstApplicable: nextGstApplicable,
        gstPercent: nextGstPercent,
        gstCents,
        totalCents,
      });
      await QuotationLineItem.destroy({ where: { quotationId: quotation.id }, transaction: t });
      await QuotationLineItem.bulkCreate(
        lines.map((li) => ({ ...li, quotationId: quotation.id })),
        { transaction: t }
      );
    } else if (discount !== undefined || gstApplicable !== undefined || gstPercent !== undefined) {
      // Discount/GST changed without touching samples — recompute from
      // the existing lines so the total stays correct.
      const existingLines = await QuotationLineItem.findAll({ where: { quotationId: quotation.id }, transaction: t });
      const { subtotalCents, gstCents, totalCents } = computeTotalsFromLines(
        existingLines, nextDiscountCents, nextGstApplicable, nextGstPercent
      );
      Object.assign(patch, {
        subtotalCents,
        discountCents: nextDiscountCents,
        gstApplicable: nextGstApplicable,
        gstPercent: nextGstPercent,
        gstCents,
        totalCents,
      });
    }

    await quotation.update(patch, { transaction: t });
  });

  const updated = await Quotation.findByPk(quotation.id, { include: INCLUDE });
  res.json(updated);
};

const setStatus = async (req, res) => {
  const quotation = await Quotation.findByPk(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

  const { status } = req.body;
  if (!canTransitionQuotation(quotation.status, status)) {
    return res.status(400).json({ error: `Cannot move quotation from "${quotation.status}" to "${status}"` });
  }
  await quotation.update({ status });
  res.json(quotation);
};

const remove = async (req, res) => {
  const quotation = await Quotation.findByPk(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  if (quotation.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft quotations can be deleted' });
  }
  await quotation.destroy();
  res.status(204).send();
};

module.exports = { list, get, create, update, setStatus, remove };
