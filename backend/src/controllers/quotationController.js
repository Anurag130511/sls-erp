const { sequelize, Quotation, QuotationLineItem, Customer, User, Parameter } = require('../models');
const { nextQuotationNumber } = require('../utils/numbering');
const { canTransitionQuotation } = require('../utils/statusTransitions');
const { toCents } = require('../utils/money');
const { scopeToOwnerUnlessAdmin, isOwnerOrAdmin } = require('../utils/ownership');

const INCLUDE = [
  { model: Customer, as: 'customer' },
  { model: QuotationLineItem, as: 'lineItems' },
  { model: User, as: 'createdBy', attributes: ['id', 'name', 'email', 'designation', 'contactNo'] },
  { model: Quotation, as: 'revisionOf', attributes: ['id', 'quotationNumber'] },
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

// Discount is a percentage of the subtotal — discountCents is always
// derived here, never entered directly, so "Total after Discount" and
// "Grand Total" (after GST) stay consistent no matter which piece changed.
function computeTotalsFromLines(lines, discountPercent, gstApplicable, gstPercent) {
  const subtotalCents = lines.reduce((sum, li) => sum + li.lineTotalCents, 0);
  const discountCents = Math.round((subtotalCents * Number(discountPercent || 0)) / 100);
  const afterDiscountCents = subtotalCents - discountCents;
  const gstCents = gstApplicable ? Math.round((afterDiscountCents * Number(gstPercent || 18)) / 100) : 0;
  const totalCents = afterDiscountCents + gstCents;
  return { subtotalCents, discountCents, gstCents, totalCents };
}

// GET /api/quotations/sample-lookup?sampleName=... — looks up the most
// recently used quotation with an exact (case-insensitive) match on
// that sample name, and returns its full parameter set ready to drop
// straight into the form — so a recurring sample type (e.g. "Drinking
// Water") doesn't need its parameters re-typed every time. Scoped the
// same way as everything else: non-admins only search their own past
// quotations, admins search everyone's.
const sampleLookup = async (req, res) => {
  const sampleName = (req.query.sampleName || '').trim();
  if (!sampleName) return res.json(null);

  const quotationWhere = {};
  if (req.user.role !== 'admin') quotationWhere.createdById = req.user.id;

  const match = await QuotationLineItem.findOne({
    where: sequelize.where(sequelize.fn('LOWER', sequelize.col('QuotationLineItem.sampleName')), sampleName.toLowerCase()),
    include: [{ model: Quotation, attributes: [], where: quotationWhere }],
    order: [['createdAt', 'DESC']],
  });
  if (!match) return res.json(null);

  const lines = await QuotationLineItem.findAll({
    where: { quotationId: match.quotationId, sampleIndex: match.sampleIndex },
    order: [['sortOrder', 'ASC']],
  });
  if (lines.length === 0) return res.json(null);

  // Rebuild the same {parameters, sampleQty, sampleCount} shape the form
  // uses, so the frontend can drop this straight in — the first row of
  // each pricing group carries that group's price; the rest are marked
  // combineWithPrevious.
  const seenGroups = new Set();
  const parameters = lines.map((li) => {
    const isFirstInGroup = !seenGroups.has(li.pricingGroupIndex);
    seenGroups.add(li.pricingGroupIndex);
    return {
      parameterId: null,
      description: li.parameterName,
      charges: isFirstInGroup ? (li.chargesPerSampleCents / 100).toString() : '',
      combineWithPrevious: !isFirstInGroup,
    };
  });

  res.json({
    sampleQty: Number(lines[0].sampleQty),
    sampleCount: Number(lines[0].sampleCount),
    parameters,
  });
};

const list = async (req, res) => {
  const { status, customerId, userId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
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
  const { customerId, issueDate, expiryDate, subject, notes, terms, samples, discountPercent, gstApplicable, gstPercent } = req.body;

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
    // GST defaults to on — this lab charges it on essentially every
    // quotation, so the form starts checked rather than requiring an
    // opt-in each time (still toggleable for the rare exempt customer).
    const gstOn = gstApplicable !== undefined ? Boolean(gstApplicable) : true;
    const { subtotalCents, discountCents, gstCents, totalCents } = computeTotalsFromLines(
      lines, discountPercent || 0, gstOn, gstPercent || 18
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
        discountPercent: discountPercent || 0,
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
// customers may be holding a copy, so the document should not silently
// change. Use "Revise" instead to create an editable copy of a sent one.
const update = async (req, res) => {
  const quotation = await Quotation.findByPk(req.params.id);
  if (!quotation || !isOwnerOrAdmin(quotation, req)) {
    return res.status(404).json({ error: 'Quotation not found' });
  }
  if (quotation.status !== 'draft') {
    return res.status(400).json({ error: `Cannot edit a quotation in "${quotation.status}" status — use Revise instead` });
  }

  const { customerId, issueDate, expiryDate, subject, notes, terms, samples, discountPercent, gstApplicable, gstPercent } = req.body;

  await sequelize.transaction(async (t) => {
    const patch = { customerId, issueDate, expiryDate, notes, terms };
    if (subject !== undefined) patch.subject = subject;
    const nextGstApplicable = gstApplicable !== undefined ? Boolean(gstApplicable) : quotation.gstApplicable;
    const nextGstPercent = gstPercent !== undefined ? gstPercent : quotation.gstPercent;
    const nextDiscountPercent = discountPercent !== undefined ? discountPercent : quotation.discountPercent;

    if (Array.isArray(samples) && samples.length > 0) {
      const lines = await buildLinesAndSaveNewParameters(samples, t);
      const { subtotalCents, discountCents, gstCents, totalCents } = computeTotalsFromLines(
        lines, nextDiscountPercent, nextGstApplicable, nextGstPercent
      );
      Object.assign(patch, {
        subtotalCents,
        discountPercent: nextDiscountPercent,
        discountCents,
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
    } else if (discountPercent !== undefined || gstApplicable !== undefined || gstPercent !== undefined) {
      // Discount/GST changed without touching samples — recompute from
      // the existing lines so the total stays correct.
      const existingLines = await QuotationLineItem.findAll({ where: { quotationId: quotation.id }, transaction: t });
      const { subtotalCents, discountCents, gstCents, totalCents } = computeTotalsFromLines(
        existingLines, nextDiscountPercent, nextGstApplicable, nextGstPercent
      );
      Object.assign(patch, {
        subtotalCents,
        discountPercent: nextDiscountPercent,
        discountCents,
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

// Creates a new, fully-editable draft quotation that's a copy of this
// one — new quotation number (same root number with a "-R<n>" suffix),
// linked back via revisionOfId. The original is never modified, so
// anyone already holding a copy of it is unaffected.
const revise = async (req, res) => {
  const source = await Quotation.findByPk(req.params.id, { include: [{ model: QuotationLineItem, as: 'lineItems' }] });
  if (!source || !isOwnerOrAdmin(source, req)) {
    return res.status(404).json({ error: 'Quotation not found' });
  }

  const result = await sequelize.transaction(async (t) => {
    const nextRevisionNumber = source.revisionNumber + 1;
    // Strip any existing "(R)"/"(R2)" suffix from the root number before
    // appending the new one, so revising a revision stays clean
    // (QT-006(R) revised again becomes QT-006(R2), not QT-006(R)(R2)).
    // The first revision is just "(R)"; later ones are numbered so each
    // revision still gets a unique, distinguishable quotation number.
    const rootNumber = source.quotationNumber.replace(/\(R\d*\)$/, '');
    const revisionSuffix = nextRevisionNumber === 1 ? '(R)' : `(R${nextRevisionNumber})`;
    const quotationNumber = `${rootNumber}${revisionSuffix}`;

    const revised = await Quotation.create(
      {
        quotationNumber,
        customerId: source.customerId,
        issueDate: new Date().toISOString().slice(0, 10),
        expiryDate: source.expiryDate,
        subject: source.subject,
        notes: source.notes,
        terms: source.terms,
        status: 'draft',
        subtotalCents: source.subtotalCents,
        discountPercent: source.discountPercent,
        discountCents: source.discountCents,
        gstApplicable: source.gstApplicable,
        gstPercent: source.gstPercent,
        gstCents: source.gstCents,
        totalCents: source.totalCents,
        createdById: req.user.id,
        salesPersonName: req.user.name,
        salesPersonDesignation: req.user.designation || null,
        salesPersonContactNo: req.user.contactNo || null,
        revisionOfId: source.id,
        revisionNumber: nextRevisionNumber,
      },
      { transaction: t }
    );

    await QuotationLineItem.bulkCreate(
      source.lineItems.map((li) => ({
        sampleName: li.sampleName,
        sampleIndex: li.sampleIndex,
        pricingGroupIndex: li.pricingGroupIndex,
        parameterName: li.parameterName,
        sampleQty: li.sampleQty,
        sampleCount: li.sampleCount,
        isCombinedPricing: li.isCombinedPricing,
        chargesPerSampleCents: li.chargesPerSampleCents,
        lineTotalCents: li.lineTotalCents,
        sortOrder: li.sortOrder,
        quotationId: revised.id,
      })),
      { transaction: t }
    );

    return revised.id;
  });

  const created = await Quotation.findByPk(result, { include: INCLUDE });
  res.status(201).json(created);
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

module.exports = { list, get, create, update, setStatus, revise, remove, sampleLookup };
