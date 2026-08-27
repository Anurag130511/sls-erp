const { baseStyles } = require('./baseStyles');
const escapeHtml = require('../utils/escapeHtml');
const { formatINR } = require('../utils/money');

function purchaseOrderHtml(po, org, logoDataUri) {
  const raisedByLine = po.createdByName
    ? po.createdByDesignation
      ? `${po.createdByName}, ${po.createdByDesignation}`
      : po.createdByName
    : null;

  const rows = po.lineItems
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (li, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(li.description)}</td>
        <td class="num">${Number(li.quantity).toFixed(2)}</td>
        <td class="num">${formatINR(li.unitPriceCents)}</td>
        <td class="num">${formatINR(li.lineTotalCents)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>${baseStyles}</style>
  </head>
  <body>
    <div class="header">
      <div class="header-left">
        <img src="${logoDataUri}" />
        <div class="org-line">${escapeHtml(org.website)}</div>
        <div class="org-line">${escapeHtml(org.address)}</div>
      </div>
      <div class="header-right">
        <div class="doc-title">Purchase Order</div>
        <div class="doc-meta"><strong>Dated:</strong> ${escapeHtml(po.issueDate)}</div>
        <div class="doc-meta"><strong>Purchase Order:</strong> ${escapeHtml(po.poNumber)}</div>
        ${po.createdByName ? `<div class="doc-meta"><strong>Raised By:</strong> ${escapeHtml(raisedByLine)}</div>` : ''}
        <div class="doc-meta"><span class="status-badge">${escapeHtml(po.status.replace('_', ' '))}</span></div>
      </div>
    </div>

    <div class="parties">
      <div class="party-box">
        <div class="party-title">About Vendor</div>
        <div class="row"><span class="label">Contact Person:</span> ${escapeHtml(po.vendor.contactPerson || '-')}</div>
        <div class="name">${escapeHtml(po.vendor.name)}</div>
        <div class="row">${escapeHtml(po.vendor.address || '')}</div>
        <div class="row"><span class="label">GST No:</span> ${escapeHtml(po.vendor.gstNo || '-')}</div>
        <div class="row"><span class="label">Email:</span> ${escapeHtml(po.vendor.email || '-')}</div>
        <div class="row"><span class="label">Phone:</span> ${escapeHtml(po.vendor.phone || '-')}</div>
      </div>
      <div class="party-box">
        <div class="party-title">Ship To</div>
        <div class="name">${escapeHtml(org.name)}</div>
        <div class="row">${escapeHtml(org.address)}</div>
        <div class="row"><span class="label">GST No:</span> ${escapeHtml(org.gst)}</div>
        <div class="row"><span class="label">Email:</span> ${escapeHtml(org.email)}</div>
        <div class="row"><span class="label">Phone:</span> ${escapeHtml(org.phone)}</div>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:32px;">#</th>
          <th>Material Details</th>
          <th class="num" style="width:70px;">Quantity</th>
          <th class="num" style="width:100px;">Unit Price</th>
          <th class="num" style="width:110px;">Total Price</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Total Price</span><span>${formatINR(po.subtotalCents)}</span></div>
      <div class="row"><span>GST @ ${Number(po.gstPercent).toFixed(0)}%</span><span>${formatINR(po.gstCents)}</span></div>
      <div class="row grand"><span>Grand Total</span><span>${formatINR(po.totalCents)}</span></div>
    </div>

    <div class="footer-grid">
      <div class="notes-box">
        <div class="title">Additional Notes</div>
        <ol>
          ${(po.notes || 'Please notify us immediately if you are unable to ship as specified.')
            .split('\n')
            .filter(Boolean)
            .map((n) => `<li>${escapeHtml(n)}</li>`)
            .join('')}
        </ol>
      </div>
      <div class="signature-box">
        <div class="signature-line">Signature of Authorized Signatory<br/>${escapeHtml(org.name)}</div>
      </div>
    </div>
  </body>
  </html>`;
}

module.exports = purchaseOrderHtml;
