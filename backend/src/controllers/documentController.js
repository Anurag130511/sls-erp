const {
  Quotation, QuotationLineItem, Customer,
  PurchaseOrder, POLineItem, Vendor,
  GeneratedDocument,
} = require('../models');
const { generateQuotationPdf, generatePurchaseOrderPdf } = require('../services/pdfService');
const storage = require('../services/storageService');
const { isOwnerOrAdmin } = require('../utils/ownership');

// Regenerating a PDF for the same document overwrites the same storage
// key and updates the existing GeneratedDocument row (rather than piling
// up duplicates), so the library always reflects the latest version.
function keyFor(docType, documentNumber) {
  const safe = documentNumber.replace(/[^a-zA-Z0-9-]/g, '-');
  return `${docType}-${safe}.pdf`;
}

// Returns null both when the quotation doesn't exist AND when the
// requester isn't allowed to see it — the route then reports a plain
// 404 either way, so a non-admin can't tell the difference between "no
// such quotation" and "exists, but isn't yours."
async function getOrCreateQuotationPdf(quotationId, req) {
  const quotation = await Quotation.findByPk(quotationId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: QuotationLineItem, as: 'lineItems' },
    ],
  });
  if (!quotation || !isOwnerOrAdmin(quotation, req)) return null;

  const key = keyFor('quotation', quotation.quotationNumber);
  const buffer = await generateQuotationPdf(quotation);
  await storage.save(key, buffer);

  await GeneratedDocument.upsert({
    docType: 'quotation',
    documentId: quotation.id,
    documentNumber: quotation.quotationNumber,
    partyName: quotation.customer?.name || null,
    createdById: quotation.createdById,
    storageKey: key,
    fileSizeBytes: buffer.length,
  }, { conflictFields: ['docType', 'documentId'] });

  return { buffer, filename: `${quotation.quotationNumber.replace(/\//g, '-')}.pdf` };
}

async function getOrCreatePurchaseOrderPdf(poId, req) {
  const po = await PurchaseOrder.findByPk(poId, {
    include: [
      { model: Vendor, as: 'vendor' },
      { model: POLineItem, as: 'lineItems' },
    ],
  });
  if (!po || !isOwnerOrAdmin(po, req)) return null;

  const key = keyFor('purchase_order', po.poNumber);
  const buffer = await generatePurchaseOrderPdf(po);
  await storage.save(key, buffer);

  await GeneratedDocument.upsert({
    docType: 'purchase_order',
    documentId: po.id,
    documentNumber: po.poNumber,
    partyName: po.vendor?.name || null,
    createdById: po.createdById,
    storageKey: key,
    fileSizeBytes: buffer.length,
  }, { conflictFields: ['docType', 'documentId'] });

  return { buffer, filename: `${po.poNumber.replace(/\//g, '-')}.pdf` };
}

// GET /api/documents — the document library, newest first. Non-admins
// only see documents generated from their own quotations/POs.
const listDocuments = async (req, res) => {
  const where = {};
  if (req.user.role !== 'admin') where.createdById = req.user.id;
  const docs = await GeneratedDocument.findAll({ where, order: [['updatedAt', 'DESC']] });
  res.json(docs);
};

// GET /api/documents/:id/download — re-download a previously generated
// PDF from storage without regenerating it.
const downloadDocument = async (req, res) => {
  const doc = await GeneratedDocument.findByPk(req.params.id);
  if (!doc || (req.user.role !== 'admin' && doc.createdById !== req.user.id)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const buffer = await storage.read(doc.storageKey);
  if (!buffer) return res.status(404).json({ error: 'Stored file is missing — try regenerating it from the document page.' });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${doc.documentNumber.replace(/\//g, '-')}.pdf"`,
  });
  res.send(buffer);
};

module.exports = {
  getOrCreateQuotationPdf,
  getOrCreatePurchaseOrderPdf,
  listDocuments,
  downloadDocument,
};
