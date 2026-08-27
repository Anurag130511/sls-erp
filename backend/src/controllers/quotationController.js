const { sequelize, Quotation, QuotationLineItem, Customer, User } = require('../models');
const { nextQuotationNumber } = require('../utils/numbering');
const { canTransitionQuotation } = require('../utils/statusTransitions');
const { toCents } = require('../utils/money');

const INCLUDE = [
  { model: Customer, as: 'customer' },
  { model: QuotationLineItem, as: 'lineItems' },
  { model: User, as: 'createdBy', attributes: ['id', 'name', 'email', 'designation'] },
];

// gstApplicable/gstPercent are optional — GST is only added to the total
// when the person creating the quotation explicitly turns it on.
function computeTotals(lineItems, gstApplicable, gstPercent) {
  let subtotalCents = 0;
  let discountCents = 0;
  const computed = lineItems.map((li) => {
    const qty = Number(li.quantity);
    const unitPriceCents = toCents(li.unitPrice);
    const lineDiscountCents = toCents(li.discount || 0);
    const lineTotalCents = Math.round(qty * unitPriceCents) - lineDiscountCents;
    subtotalCents += Math.round(qty * unitPriceCents);
    discountCents += lineDiscountCents;
    return {
      parameterId: li.parameterId || null,
      description: li.description,
      quantity: qty,
      unitPriceCents,
      discountCents: lineDiscountCents,
      lineTotalCents,
      sortOrder: li.sortOrder || 0,
    };
  });
  const preTaxTotalCents = subtotalCents - discountCents;
  const gstCents = gstApplicable ? Math.round((preTaxTotalCents * Number(gstPercent || 18)) / 100) : 0;
  const totalCents = preTaxTotalCents + gstCents;
  return { computed, subtotalCents, discountCents, gstCents, totalCents };
}

const list = async (req, res) => {
  const { status, customerId, userId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  // userId filters to one salesperson's quotations — used by the admin
  // Reports page, and available to anyone for a "just mine" view.
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
  const { customerId, issueDate, expiryDate, notes, terms, lineItems, gstApplicable, gstPercent } = req.body;
  if (!customerId || !issueDate || !Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'customerId, issueDate and at least one line item are required' });
  }

  const result = await sequelize.transaction(async (t) => {
    const quotationNumber = await nextQuotationNumber();
    const { computed, subtotalCents, discountCents, gstCents, totalCents } = computeTotals(
      lineItems,
      Boolean(gstApplicable),
      gstPercent || 18
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
        // Auto-filled from the logged-in user — not something the form
        // lets anyone type in, so it can't be misattributed.
        createdById: req.user.id,
        salesPersonName: req.user.name,
        salesPersonDesignation: req.user.designation || null,
      },
      { transaction: t }
    );

    await QuotationLineItem.bulkCreate(
      computed.map((li) => ({ ...li, quotationId: quotation.id })),
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

  const { customerId, issueDate, expiryDate, notes, terms, lineItems, gstApplicable, gstPercent } = req.body;

  await sequelize.transaction(async (t) => {
    const patch = { customerId, issueDate, expiryDate, notes, terms };
    const nextGstApplicable = gstApplicable !== undefined ? Boolean(gstApplicable) : quotation.gstApplicable;
    const nextGstPercent = gstPercent !== undefined ? gstPercent : quotation.gstPercent;

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      const { computed, subtotalCents, discountCents, gstCents, totalCents } = computeTotals(
        lineItems,
        nextGstApplicable,
        nextGstPercent
      );
      Object.assign(patch, {
        subtotalCents,
        discountCents,
        gstApplicable: nextGstApplicable,
        gstPercent: nextGstPercent,
        gstCents,
        totalCents,
      });
      await QuotationLineItem.destroy({ where: { quotationId: quotation.id }, transaction: t });
      await QuotationLineItem.bulkCreate(
        computed.map((li) => ({ ...li, quotationId: quotation.id })),
        { transaction: t }
      );
    } else if (gstApplicable !== undefined || gstPercent !== undefined) {
      // GST setting changed without touching line items — recompute from
      // the existing lines so the total stays correct.
      const existingLines = await QuotationLineItem.findAll({ where: { quotationId: quotation.id }, transaction: t });
      const preTaxTotalCents = existingLines.reduce((sum, li) => sum + li.lineTotalCents, 0);
      const gstCents = nextGstApplicable ? Math.round((preTaxTotalCents * Number(nextGstPercent)) / 100) : 0;
      Object.assign(patch, {
        gstApplicable: nextGstApplicable,
        gstPercent: nextGstPercent,
        gstCents,
        totalCents: preTaxTotalCents + gstCents,
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
