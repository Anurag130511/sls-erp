const {
  Quotation, QuotationLineItem, Customer,
  PurchaseOrder, POLineItem, Vendor,
  GeneratedDocument,
} = require('../models');
const { generateQuotationPdf, generatePurchaseOrderPdf } = require('../services/pdfService');
const storage = require('../services/storageService');

// Regenerating a PDF for the same document overwrites the same storage
// key and updates the existing GeneratedDocument row (rather than piling
// up duplicates), so the library always reflects the latest version.
function keyFor(docType, documentNumber) {
  const safe = documentNumber.replace(/[^a-zA-Z0-9-]/g, '-');
  return `${docType}-${safe}.pdf`;
}

async function getOrCreateQuotationPdf(quotationId) {
  const quotation = await Quotation.findByPk(quotationId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: QuotationLineItem, as: 'lineItems' },
    ],
  });
  if (!quotation) return null;

  const key = keyFor('quotation', quotation.quotationNumber);
  const buffer = await generateQuotationPdf(quotation);
  await storage.save(key, buffer);

  await GeneratedDocument.upsert({
    docType: 'quotation',
    documentId: quotation.id,
    documentNumber: quotation.quotationNumber,
    partyName: quotation.customer?.name || null,
    storageKey: key,
    fileSizeBytes: buffer.length,
  }, { conflictFields: ['docType', 'documentId'] });

  return { buffer, filename: `${quotation.quotationNumber.replace(/\//g, '-')}.pdf` };
}

async function getOrCreatePurchaseOrderPdf(poId) {
  const po = await PurchaseOrder.findByPk(poId, {
    include: [
      { model: Vendor, as: 'vendor' },
      { model: POLineItem, as: 'lineItems' },
    ],
  });
  if (!po) return null;

  const key = keyFor('purchase_order', po.poNumber);
  const buffer = await generatePurchaseOrderPdf(po);
  await storage.save(key, buffer);

  await GeneratedDocument.upsert({
    docType: 'purchase_order',
    documentId: po.id,
    documentNumber: po.poNumber,
    partyName: po.vendor?.name || null,
    storageKey: key,
    fileSizeBytes: buffer.length,
  }, { conflictFields: ['docType', 'documentId'] });

  return { buffer, filename: `${po.poNumber.replace(/\//g, '-')}.pdf` };
}

// GET /api/documents — the document library, newest first.
const listDocuments = async (req, res) => {
  const docs = await GeneratedDocument.findAll({ order: [['updatedAt', 'DESC']] });
  res.json(docs);
};

// GET /api/documents/:id/download — re-download a previously generated
// PDF from storage without regenerating it.
const downloadDocument = async (req, res) => {
  const doc = await GeneratedDocument.findByPk(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

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
