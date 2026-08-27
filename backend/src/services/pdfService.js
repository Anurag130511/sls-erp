const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const purchaseOrderHtml = require('../templates/purchaseOrder');
const quotationHtml = require('../templates/quotation');

const LOGO_PATH = path.join(__dirname, '../../assets/logo.png');

function getLogoDataUri() {
  const buffer = fs.readFileSync(LOGO_PATH);
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
  const html = quotationHtml(quotation, getOrgFromEnv(), getLogoDataUri());
  return renderPdf(html);
}

module.exports = { generatePurchaseOrderPdf, generateQuotationPdf };
