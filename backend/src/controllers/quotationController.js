const { sequelize, Quotation, QuotationLineItem, Customer, User, Parameter } = require('../models');
const { nextQuotationNumber } = require('../utils/numbering');
const { canTransitionQuotation } = require('../utils/statusTransitions');
const { toCents } = require('../utils/money');
const { scopeToOwnerUnlessAdmin, isOwnerOrAdmin } = require('../utils/ownership');

const INCLUDE = [
  { model: Customer, as: 'customer' },
  { model: QuotationLineItem, as: 'lineItems' },
  { model: User, as: 'createdBy', attributes: ['id', 'name', 'email', 'designation', 'contactNo'] },
];

/**
 * Converts the samples the form sends into one QuotationLineItem row per
 * PARAMETER (each gets its own Sr. No. in the table). Every named
 * parameter (typed or picked from the catalog) is auto-saved to the
 * Parameter catalog if it doesn't already exist there — matching is by
 * exact name (case-insensitive) so re-typing an existing one reuses it
 * instead of creating a duplicate.
 *
 * Within a sample, each parameter can either stand alone (its own
 * price) or be marked "combine with previous" to join the pricing group
 * of the parameter directly above it — chaining lets 3+ parameters
 * share one combined price. This means a single sample can freely mix
 * individually-priced parameters with combined-price groups. A group's
 * charge lands on its first parameter row (chargesPerSampleCents on the
 * rest of that group is 0); the detail page/PDF render that as a single
 * merged cell spanning every row in the group instead of repeating it.
 */
async function buildLinesAndSaveNewParameters(samples, t) {
  const lines = [];
  let sortOrder = 0;

  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
    const sample = samples[sampleIndex];
    const sampleName = (sample.sampleName || '').trim();
    const sampleQty = Number(sample.sampleQty || 1);
    const sampleCount = Number(sample.sampleCount || 1);

    // Split this sample's parameters into pricing groups: a new group
    // starts at index 0 or whenever a parameter is NOT marked to combine
    // with the previous one; combineWithPrevious chains it onto the
    // current group instead.
    const groups = [];
    for (let i = 0; i < sample.parameters.length; i++) {
      const param = sample.parameters[i];
      if (i === 0 || !param.combineWithPrevious) {
        groups.push([param]);
      } else {
        groups[groups.length - 1].push(param);
      }
    }

    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex];
      const isCombinedPricing = group.length > 1;
      // The group's price is always entered on its first (root) member —
      // members added via "combine with previous" don't get their own
      // price field in the UI, so their own `charges` value is ignored.
      const groupChargeCents = toCents(group[0].charges || 0);

      for (let j = 0; j < group.length; j++) {
        const param = group[j];
        const parameterName = (param.description || '').trim();

        if (parameterName) {
          const existing = await Parameter.findOne({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), parameterName.toLowerCase()),
            transaction: t,
          });
          if (!existing) {
            await Parameter.create({ name: parameterName, unitPriceCents: 0, unit: 'test' }, { transaction: t });
          }
        }

        const chargesPerSampleCents = j === 0 ? groupChargeCents : 0;
        const lineTotalCents = Math.round(chargesPerSampleCents * sampleQty * sampleCount);

        lines.push({
          sampleName,
          sampleIndex,
          pricingGroupIndex: groupIndex,
          parameterName,
          sampleQty,
          sampleCount,
          isCombinedPricing,
          chargesPerSampleCents,
          lineTotalCents,
          sortOrder: sortOrder++,
        });
      }
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
  // Admins can optionally filter to one salesperson (e.g. from Reports);
  // non-admins are always scoped to their own records regardless of
  // what's in the query string.
  if (req.user.role === 'admin') {
    if (userId) where.createdById = userId;
  } else {
    where.createdById = req.user.id;
  }
  const quotations = await Quotation.findAll({ where, include: INCLUDE, order: [['issueDate', 'DESC']] });
  res.json(quotations);
};

const get = async (req, res) => {
  const quotation = await Quotation.findByPk(req.params.id, { include: INCLUDE });
  if (!quotation || !isOwnerOrAdmin(quotation, req)) {
    return res.status(404).json({ error: 'Quotation not found' });
  }
  res.json(quotation);
};

const create = async (req, res) => {
  const { customerId, issueDate, expiryDate, subject, notes, terms, samples, discount, gstApplicable, gstPercent } = req.body;

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
    const lines = await buildLinesAndSaveNewParameters(samples, t);
    const discountCents = toCents(discount || 0);
    // GST defaults to on — this lab charges it on essentially every
    // quotation, so the form starts checked rather than requiring an
    // opt-in each time (still toggleable for the rare exempt customer).
    const gstOn = gstApplicable !== undefined ? Boolean(gstApplicable) : true;
    const { subtotalCents, gstCents, totalCents } = computeTotalsFromLines(
      lines, discountCents, gstOn, gstPercent || 18
    );

    const quotation = await Quotation.create(
      {
        quotationNumber,
        customerId,
        issueDate,
        expiryDate,
        subject: subject || null,
        notes,
        terms,
        status: 'draft',
        subtotalCents,
        discountCents,
        gstApplicable: gstOn,
        gstPercent: gstPercent || 18,
        gstCents,
        totalCents,
        createdById: req.user.id,
        salesPersonName: req.user.name,
        salesPersonDesignation: req.user.designation || null,
        salesPersonContactNo: req.user.contactNo || null,
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
  if (!quotation || !isOwnerOrAdmin(quotation, req)) {
    return res.status(404).json({ error: 'Quotation not found' });
  }
  if (quotation.status !== 'draft') {
    return res.status(400).json({ error: `Cannot edit a quotation in "${quotation.status}" status` });
  }

  const { customerId, issueDate, expiryDate, subject, notes, terms, samples, discount, gstApplicable, gstPercent } = req.body;

  await sequelize.transaction(async (t) => {
    const patch = { customerId, issueDate, expiryDate, notes, terms };
    if (subject !== undefined) patch.subject = subject;
    const nextGstApplicable = gstApplicable !== undefined ? Boolean(gstApplicable) : quotation.gstApplicable;
    const nextGstPercent = gstPercent !== undefined ? gstPercent : quotation.gstPercent;
    const nextDiscountCents = discount !== undefined ? toCents(discount) : quotation.discountCents;

    if (Array.isArray(samples) && samples.length > 0) {
      const lines = await buildLinesAndSaveNewParameters(samples, t);
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
  if (!quotation || !isOwnerOrAdmin(quotation, req)) {
    return res.status(404).json({ error: 'Quotation not found' });
  }

  const { status } = req.body;
  if (!canTransitionQuotation(quotation.status, status)) {
    return res.status(400).json({ error: `Cannot move quotation from "${quotation.status}" to "${status}"` });
  }
  await quotation.update({ status });
  res.json(quotation);
};

const remove = async (req, res) => {
  const quotation = await Quotation.findByPk(req.params.id);
  if (!quotation || !isOwnerOrAdmin(quotation, req)) {
    return res.status(404).json({ error: 'Quotation not found' });
  }
  if (quotation.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft quotations can be deleted' });
  }
  await quotation.destroy();
  res.status(204).send();
};

module.exports = { list, get, create, update, setStatus, remove };
