const { Customer, Vendor, Item, Parameter } = require('../models');
const { parseWorkbook, mapRow, buildTemplateBuffer } = require('../utils/excelImport');
const { toCents } = require('../utils/money');

// Column aliases so users don't have to match header names exactly —
// common variants (e.g. "Company Name" vs "Name", "GST" vs "GST No") all map in.
const PARTY_ALIAS_MAP = {
  name: ['name', 'company name', 'customer name', 'vendor name'],
  contactPerson: ['contact person', 'contact', 'contact name'],
  address: ['address'],
  gstNo: ['gst no', 'gst', 'gstin', 'gst number'],
  email: ['email', 'email id'],
  phone: ['phone', 'phone number', 'mobile', 'contact number'],
};

const ITEM_ALIAS_MAP = {
  name: ['name', 'item name', 'material', 'material name', 'product name'],
  sku: ['sku', 'item code', 'code'],
  description: ['description', 'details'],
  unit: ['unit', 'uom'],
  unitPrice: ['unit price', 'price', 'rate'],
};

const PARAMETER_ALIAS_MAP = {
  name: ['name', 'parameter', 'parameter name', 'test', 'test name'],
  code: ['code', 'parameter code', 'test code'],
  description: ['description', 'details', 'method'],
  unit: ['unit', 'uom'],
  unitPrice: ['unit price', 'price', 'rate', 'test price'],
};

const PARTY_TEMPLATE_HEADERS = ['Name', 'Contact Person', 'Address', 'GST No', 'Email', 'Phone'];
const PARTY_TEMPLATE_EXAMPLE = ['Acme Labs Pvt. Ltd.', 'Mr. Ravi Kumar', '123 Industrial Area, Chandigarh', '04AABCD1234E1ZP', 'accounts@acmelabs.com', '+91 9812345678'];

const ITEM_TEMPLATE_HEADERS = ['Name', 'SKU', 'Description', 'Unit', 'Unit Price'];
const ITEM_TEMPLATE_EXAMPLE = ['Listeria monocytogenes ATCC 19111', 'MC-ATCC-19111', 'Passage Third (Packing - 2 sticks)', 'kit', '14700'];

const PARAMETER_TEMPLATE_HEADERS = ['Name', 'Code', 'Description', 'Unit', 'Unit Price'];
const PARAMETER_TEMPLATE_EXAMPLE = ['pH', 'PH-01', 'IS 3025 (Part 11)', 'test', '250'];

async function importParties(Model, req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let rows;
  try {
    rows = parseWorkbook(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: 'Could not read the file — is it a valid Excel/CSV file?' });
  }

  const created = [];
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for header row, +1 for 1-indexing
    const mapped = mapRow(rows[i], PARTY_ALIAS_MAP);

    if (!mapped.name) {
      skipped.push({ row: rowNum, reason: 'Missing name' });
      continue;
    }

    const existing = await Model.findOne({ where: { name: mapped.name } });
    if (existing) {
      skipped.push({ row: rowNum, reason: `"${mapped.name}" already exists` });
      continue;
    }

    const record = await Model.create(mapped);
    created.push({ row: rowNum, id: record.id, name: record.name });
  }

  res.json({ createdCount: created.length, skippedCount: skipped.length, created, skipped });
}

const importCustomers = (req, res) => importParties(Customer, req, res);
const importVendors = (req, res) => importParties(Vendor, req, res);

async function importItems(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let rows;
  try {
    rows = parseWorkbook(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: 'Could not read the file — is it a valid Excel/CSV file?' });
  }

  const created = [];
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const mapped = mapRow(rows[i], ITEM_ALIAS_MAP);

    if (!mapped.name) {
      skipped.push({ row: rowNum, reason: 'Missing name' });
      continue;
    }

    const priceNumber = Number(mapped.unitPrice);
    if (mapped.unitPrice !== undefined && Number.isNaN(priceNumber)) {
      skipped.push({ row: rowNum, reason: `Unit price "${mapped.unitPrice}" is not a number` });
      continue;
    }

    if (mapped.sku) {
      const existing = await Item.findOne({ where: { sku: mapped.sku } });
      if (existing) {
        skipped.push({ row: rowNum, reason: `SKU "${mapped.sku}" already exists` });
        continue;
      }
    }

    const record = await Item.create({
      name: mapped.name,
      sku: mapped.sku || null,
      description: mapped.description || null,
      unit: mapped.unit || 'unit',
      unitPriceCents: toCents(priceNumber || 0),
    });
    created.push({ row: rowNum, id: record.id, name: record.name });
  }

  res.json({ createdCount: created.length, skippedCount: skipped.length, created, skipped });
}

async function importParameters(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let rows;
  try {
    rows = parseWorkbook(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: 'Could not read the file — is it a valid Excel/CSV file?' });
  }

  const created = [];
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const mapped = mapRow(rows[i], PARAMETER_ALIAS_MAP);

    if (!mapped.name) {
      skipped.push({ row: rowNum, reason: 'Missing name' });
      continue;
    }

    const priceNumber = Number(mapped.unitPrice);
    if (mapped.unitPrice !== undefined && Number.isNaN(priceNumber)) {
      skipped.push({ row: rowNum, reason: `Unit price "${mapped.unitPrice}" is not a number` });
      continue;
    }

    const existing = await Parameter.findOne({ where: { name: mapped.name } });
    if (existing) {
      skipped.push({ row: rowNum, reason: `"${mapped.name}" already exists` });
      continue;
    }

    const record = await Parameter.create({
      name: mapped.name,
      code: mapped.code || null,
      description: mapped.description || null,
      unit: mapped.unit || 'test',
      unitPriceCents: toCents(priceNumber || 0),
    });
    created.push({ row: rowNum, id: record.id, name: record.name });
  }

  res.json({ createdCount: created.length, skippedCount: skipped.length, created, skipped });
}

function sendTemplate(res, headers, example, filename) {
  const buffer = buildTemplateBuffer(headers, example);
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.send(buffer);
}

const customerTemplate = (req, res) => sendTemplate(res, PARTY_TEMPLATE_HEADERS, PARTY_TEMPLATE_EXAMPLE, 'customers_template.xlsx');
const vendorTemplate = (req, res) => sendTemplate(res, PARTY_TEMPLATE_HEADERS, PARTY_TEMPLATE_EXAMPLE, 'vendors_template.xlsx');
const itemTemplate = (req, res) => sendTemplate(res, ITEM_TEMPLATE_HEADERS, ITEM_TEMPLATE_EXAMPLE, 'items_template.xlsx');
const parameterTemplate = (req, res) => sendTemplate(res, PARAMETER_TEMPLATE_HEADERS, PARAMETER_TEMPLATE_EXAMPLE, 'parameters_template.xlsx');

module.exports = {
  importCustomers,
  importVendors,
  importItems,
  importParameters,
  customerTemplate,
  vendorTemplate,
  itemTemplate,
  parameterTemplate,
};
