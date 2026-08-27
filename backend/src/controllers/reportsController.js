const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { Quotation, Customer, PurchaseOrder, Vendor, User } = require('../models');
const { toRupees } = require('../utils/money');

function buildWorkbookBuffer(rows, sheetName) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function dateRangeWhere(from, to) {
  const where = {};
  if (from || to) {
    where.issueDate = {};
    if (from) where.issueDate[Op.gte] = from;
    if (to) where.issueDate[Op.lte] = to;
  }
  return where;
}

// GET /api/reports/quotations?userId=&from=&to=
// userId omitted = every salesperson's quotations ("overall"); userId set
// = just that one salesperson's ("user-wise"). Admin-only (see routes).
const exportQuotations = async (req, res) => {
  const { userId, from, to } = req.query;
  const where = dateRangeWhere(from, to);
  if (userId) where.createdById = userId;

  const quotations = await Quotation.findAll({
    where,
    include: [
      { model: Customer, as: 'customer' },
      { model: User, as: 'createdBy', attributes: ['name'] },
    ],
    order: [['issueDate', 'DESC']],
  });

  const rows = quotations.map((q) => ({
    'Quotation Number': q.quotationNumber,
    'Customer': q.customer?.name || '',
    'Sales Person': q.salesPersonName || q.createdBy?.name || '',
    'Designation': q.salesPersonDesignation || '',
    'Issue Date': q.issueDate,
    'Valid Until': q.expiryDate || '',
    'Status': q.status,
    'Subtotal': toRupees(q.subtotalCents),
    'Discount': toRupees(q.discountCents),
    'GST %': q.gstApplicable ? Number(q.gstPercent) : 0,
    'GST Amount': toRupees(q.gstCents),
    'Total': toRupees(q.totalCents),
  }));

  const label = userId
    ? (quotations[0]?.salesPersonName || quotations[0]?.createdBy?.name || 'user')
    : 'all-salespeople';
  const filename = `quotations_${label.replace(/\s+/g, '-')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const buffer = buildWorkbookBuffer(rows, 'Quotations');
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.send(buffer);
};

// GET /api/reports/purchase-orders?userId=&from=&to=
const exportPurchaseOrders = async (req, res) => {
  const { userId, from, to } = req.query;
  const where = dateRangeWhere(from, to);
  if (userId) where.createdById = userId;

  const pos = await PurchaseOrder.findAll({
    where,
    include: [
      { model: Vendor, as: 'vendor' },
      { model: User, as: 'createdBy', attributes: ['name'] },
    ],
    order: [['issueDate', 'DESC']],
  });

  const rows = pos.map((p) => ({
    'PO Number': p.poNumber,
    'Vendor': p.vendor?.name || '',
    'Raised By': p.createdByName || p.createdBy?.name || '',
    'Issue Date': p.issueDate,
    'Expected Delivery': p.expectedDeliveryDate || '',
    'Status': p.status,
    'Subtotal': toRupees(p.subtotalCents),
    'GST %': Number(p.gstPercent),
    'GST Amount': toRupees(p.gstCents),
    'Grand Total': toRupees(p.totalCents),
  }));

  const label = userId
    ? (pos[0]?.createdByName || pos[0]?.createdBy?.name || 'user')
    : 'all-users';
  const filename = `purchase_orders_${label.replace(/\s+/g, '-')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const buffer = buildWorkbookBuffer(rows, 'Purchase Orders');
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.send(buffer);
};

module.exports = { exportQuotations, exportPurchaseOrders };
