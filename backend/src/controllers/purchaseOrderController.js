const { sequelize, PurchaseOrder, POLineItem, Vendor, Quotation, User } = require('../models');
const { nextPONumber } = require('../utils/numbering');
const { canTransitionPO } = require('../utils/statusTransitions');
const { toCents } = require('../utils/money');
const { scopeToOwnerUnlessAdmin, isOwnerOrAdmin } = require('../utils/ownership');

const INCLUDE = [
  { model: Vendor, as: 'vendor' },
  { model: POLineItem, as: 'lineItems' },
  { model: User, as: 'createdBy', attributes: ['id', 'name', 'email', 'designation'] },
];

function computeTotals(lineItems, gstPercent) {
  let subtotalCents = 0;
  const computed = lineItems.map((li) => {
    const qty = Number(li.quantity);
    const unitPriceCents = toCents(li.unitPrice);
    const lineTotalCents = Math.round(qty * unitPriceCents);
    subtotalCents += lineTotalCents;
    return {
      itemId: li.itemId || null,
      description: li.description,
      quantity: qty,
      unitPriceCents,
      lineTotalCents,
      quantityReceived: 0,
      sortOrder: li.sortOrder || 0,
    };
  });
  const gstCents = Math.round((subtotalCents * Number(gstPercent || 0)) / 100);
  const totalCents = subtotalCents + gstCents;
  return { computed, subtotalCents, gstCents, totalCents };
}

const list = async (req, res) => {
  const { status, vendorId, userId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (vendorId) where.vendorId = vendorId;
  if (req.user.role === 'admin') {
    if (userId) where.createdById = userId;
  } else {
    where.createdById = req.user.id;
  }
  const pos = await PurchaseOrder.findAll({ where, include: INCLUDE, order: [['issueDate', 'DESC']] });
  res.json(pos);
};

const get = async (req, res) => {
  const po = await PurchaseOrder.findByPk(req.params.id, { include: INCLUDE });
  if (!po || !isOwnerOrAdmin(po, req)) {
    return res.status(404).json({ error: 'Purchase order not found' });
  }
  res.json(po);
};

const create = async (req, res) => {
  const { vendorId, issueDate, expectedDeliveryDate, notes, terms, lineItems, gstPercent, sourceQuotationId } = req.body;
  if (!vendorId || !issueDate || !Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'vendorId, issueDate and at least one line item are required' });
  }

  const result = await sequelize.transaction(async (t) => {
    const poNumber = await nextPONumber();
    const { computed, subtotalCents, gstCents, totalCents } = computeTotals(lineItems, gstPercent);

    const po = await PurchaseOrder.create(
      {
        poNumber,
        vendorId,
        issueDate,
        expectedDeliveryDate,
        notes,
        terms,
        status: 'draft',
        sourceQuotationId: sourceQuotationId || null,
        gstPercent: gstPercent || 0,
        subtotalCents,
        gstCents,
        totalCents,
        createdById: req.user.id,
        createdByName: req.user.name,
        createdByDesignation: req.user.designation || null,
      },
      { transaction: t }
    );

    await POLineItem.bulkCreate(
      computed.map((li) => ({ ...li, purchaseOrderId: po.id })),
      { transaction: t }
    );

    return po.id;
  });

  const created = await PurchaseOrder.findByPk(result, { include: INCLUDE });
  res.status(201).json(created);
};

const update = async (req, res) => {
  const po = await PurchaseOrder.findByPk(req.params.id);
  if (!po || !isOwnerOrAdmin(po, req)) {
    return res.status(404).json({ error: 'Purchase order not found' });
  }
  if (po.status !== 'draft') {
    return res.status(400).json({ error: `Cannot edit a purchase order in "${po.status}" status` });
  }

  const { vendorId, issueDate, expectedDeliveryDate, notes, terms, lineItems, gstPercent } = req.body;

  await sequelize.transaction(async (t) => {
    const patch = { vendorId, issueDate, expectedDeliveryDate, notes, terms };
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      const { computed, subtotalCents, gstCents, totalCents } = computeTotals(
        lineItems,
        gstPercent !== undefined ? gstPercent : po.gstPercent
      );
      Object.assign(patch, { subtotalCents, gstCents, totalCents, gstPercent: gstPercent !== undefined ? gstPercent : po.gstPercent });
      await POLineItem.destroy({ where: { purchaseOrderId: po.id }, transaction: t });
      await POLineItem.bulkCreate(
        computed.map((li) => ({ ...li, purchaseOrderId: po.id })),
        { transaction: t }
      );
    }
    await po.update(patch, { transaction: t });
  });

  const updated = await PurchaseOrder.findByPk(po.id, { include: INCLUDE });
  res.json(updated);
};

const setStatus = async (req, res) => {
  const po = await PurchaseOrder.findByPk(req.params.id);
  if (!po || !isOwnerOrAdmin(po, req)) {
    return res.status(404).json({ error: 'Purchase order not found' });
  }

  const { status } = req.body;
  if (!canTransitionPO(po.status, status)) {
    return res.status(400).json({ error: `Cannot move purchase order from "${po.status}" to "${status}"` });
  }
  await po.update({ status });
  res.json(po);
};

// Records goods received against line items and auto-advances the PO
// status to partially_received or received based on total quantities.
const receiveItems = async (req, res) => {
  const po = await PurchaseOrder.findByPk(req.params.id, { include: INCLUDE });
  if (!po || !isOwnerOrAdmin(po, req)) {
    return res.status(404).json({ error: 'Purchase order not found' });
  }

  const { receipts } = req.body; // [{ lineItemId, quantityReceived }]
  if (!Array.isArray(receipts) || receipts.length === 0) {
    return res.status(400).json({ error: 'receipts array is required' });
  }

  await sequelize.transaction(async (t) => {
    for (const r of receipts) {
      const line = po.lineItems.find((li) => li.id === r.lineItemId);
      if (!line) continue;
      const newQty = Math.min(Number(line.quantity), Number(r.quantityReceived));
      await line.update({ quantityReceived: newQty }, { transaction: t });
    }
  });

  const refreshed = await PurchaseOrder.findByPk(po.id, { include: INCLUDE });
  const allReceived = refreshed.lineItems.every((li) => Number(li.quantityReceived) >= Number(li.quantity));
  const anyReceived = refreshed.lineItems.some((li) => Number(li.quantityReceived) > 0);
  const nextStatus = allReceived ? 'received' : anyReceived ? 'partially_received' : refreshed.status;

  if (nextStatus !== refreshed.status && canTransitionPO(refreshed.status, nextStatus)) {
    await refreshed.update({ status: nextStatus });
  }

  res.json(refreshed);
};

const remove = async (req, res) => {
  const po = await PurchaseOrder.findByPk(req.params.id);
  if (!po || !isOwnerOrAdmin(po, req)) {
    return res.status(404).json({ error: 'Purchase order not found' });
  }
  if (po.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft purchase orders can be deleted' });
  }
  await po.destroy();
  res.status(204).send();
};

module.exports = { list, get, create, update, setStatus, receiveItems, remove };
