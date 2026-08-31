const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const purchaseOrderHtml = require('../templates/purchaseOrder');
const quotationHtml = require('../templates/quotation');

const LOGO_PATH = path.join(__dirname, '../../assets/logo.png');
const SIGNATURE_PATH = path.join(__dirname, '../../assets/signature.png');

function getLogoDataUri() {
  const buffer = fs.readFileSync(LOGO_PATH);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

// Returns null if no signature image has been provided — the quotation
// template falls back to a plain text "Authorized Signatory" block in
// that case, so this is safe to call even before one is set up.
function getSignatureDataUri() {
  if (!fs.existsSync(SIGNATURE_PATH)) return null;
  const buffer = fs.readFileSync(SIGNATURE_PATH);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

function getOrgFromEnv() {
  return {
    name: process.env.ORG_NAME || 'Your Company Pvt. Ltd.',
    website: process.env.ORG_WEBSITE || '',
    address: process.env.ORG_ADDRESS || '',
    email: process.env.ORG_EMAIL || '',
    phone: process.env.ORG_PHONE || '',
    gst: process.env.ORG_GST || '',
  };
}

// Quotations use their own letterhead details, separate from the shared
// ORG_* used by Purchase Orders' "Ship To" block — those are genuinely
// different addresses for this business (a receiving/shipping address
// for vendor deliveries vs. the lab's own letterhead address for
// quotations). Each QUOTE_ORG_* falls back to the shared ORG_* value if
// not set. PAN, accreditation, and bank details fall back to this
// business's actual real values (confirmed from the reference documents
// provided) rather than blank, so the PDF is correct even without every
// QUOTE_ORG_* env var set on the host — still overridable via env var
// if any of these details ever change.
function getQuotationOrgFromEnv() {
  return {
    name: process.env.QUOTE_ORG_NAME || process.env.ORG_NAME || 'Your Company Pvt. Ltd.',
    address: process.env.QUOTE_ORG_ADDRESS || process.env.ORG_ADDRESS || '',
    email: process.env.QUOTE_ORG_EMAIL || process.env.ORG_EMAIL || '',
    phone: process.env.QUOTE_ORG_PHONE || process.env.ORG_PHONE || '',
    gst: process.env.QUOTE_ORG_GST || process.env.ORG_GST || '',
    pan: process.env.QUOTE_ORG_PAN || 'AAWCS9548J',
    accreditation: process.env.QUOTE_ORG_ACCREDITATION || '(NABL Accredited Laboratory), TC-11169',
    footerAddress: process.env.QUOTE_ORG_FOOTER_ADDRESS || '', // corporate/registered address line for the PDF footer
    quoteValidityDays: process.env.QUOTE_ORG_VALIDITY_DAYS || '30',
    bankAccountName: process.env.QUOTE_ORG_BANK_ACCOUNT_NAME || 'Shoolini Lifesciences Pvt. Ltd.',
    bankName: process.env.QUOTE_ORG_BANK_NAME || 'Punjab National Bank',
    bankAccountNo: process.env.QUOTE_ORG_BANK_ACCOUNT_NO || '0433002100075898',
    bankBranch: process.env.QUOTE_ORG_BANK_BRANCH || 'The mall Road, Solan',
    bankIfsc: process.env.QUOTE_ORG_BANK_IFSC || 'PUNB0043300',
  };
}

// A single shared browser instance is reused across requests — launching
// Chromium per-request is slow. It's started lazily on first use.
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

async function renderPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
    });
    return buffer;
  } finally {
    await page.close();
  }
}

async function generatePurchaseOrderPdf(po) {
  const html = purchaseOrderHtml(po, getOrgFromEnv(), getLogoDataUri());
  return renderPdf(html);
}

async function generateQuotationPdf(quotation) {
  const html = quotationHtml(quotation, getQuotationOrgFromEnv(), getLogoDataUri(), getSignatureDataUri());
  return renderPdf(html);
}

module.exports = { generatePurchaseOrderPdf, generateQuotationPdf };
