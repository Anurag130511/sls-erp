const { baseStyles } = require('./baseStyles');
const escapeHtml = require('../utils/escapeHtml');
const { formatINR } = require('../utils/money');

function quotationHtml(quotation, org, logoDataUri) {
  const salesPersonLine = quotation.salesPersonName
    ? quotation.salesPersonDesignation
      ? `${quotation.salesPersonName}, ${quotation.salesPersonDesignation}`
      : quotation.salesPersonName
    : null;

  // Group flat line items back into samples (each line already carries
  // its sampleName), preserving the order they were entered in.
  const sorted = [...quotation.lineItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const sampleGroups = [];
  for (const li of sorted) {
    let group = sampleGroups.find((g) => g.sampleName === li.sampleName);
    if (!group) {
      group = { sampleName: li.sampleName, parameters: [] };
      sampleGroups.push(group);
    }
    group.parameters.push(li);
  }

  const rows = sampleGroups
    .map((group) => {
      const sampleHeaderRow = `
      <tr class="sample-row">
        <td colspan="4">${escapeHtml(group.sampleName)}</td>
      </tr>`;
      const paramRows = group.parameters
        .map(
          (li) => `
      <tr>
        <td style="padding-left:24px;">${escapeHtml(li.description)}</td>
        <td class="num">${Number(li.quantity).toFixed(2)}</td>
        <td class="num">${formatINR(li.unitPriceCents)}</td>
        <td class="num">${formatINR(li.lineTotalCents)}</td>
      </tr>`
        )
        .join('');
      return sampleHeaderRow + paramRows;
    })
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
        <div class="doc-title">Quotation</div>
        <div class="doc-meta"><strong>Dated:</strong> ${escapeHtml(quotation.issueDate)}</div>
        <div class="doc-meta"><strong>Quotation:</strong> ${escapeHtml(quotation.quotationNumber)}</div>
        ${quotation.expiryDate ? `<div class="doc-meta"><strong>Valid Until:</strong> ${escapeHtml(quotation.expiryDate)}</div>` : ''}
        ${quotation.salesPersonName ? `<div class="doc-meta"><strong>Sales Person:</strong> ${escapeHtml(salesPersonLine)}</div>` : ''}
        <div class="doc-meta"><span class="status-badge">${escapeHtml(quotation.status)}</span></div>
      </div>
    </div>

    <div class="parties">
      <div class="party-box">
        <div class="party-title">Quoted To</div>
        <div class="row"><span class="label">Contact Person:</span> ${escapeHtml(quotation.customer.contactPerson || '-')}</div>
        <div class="name">${escapeHtml(quotation.customer.name)}</div>
        <div class="row">${escapeHtml(quotation.customer.address || '')}</div>
        <div class="row"><span class="label">GST No:</span> ${escapeHtml(quotation.customer.gstNo || '-')}</div>
        <div class="row"><span class="label">Email:</span> ${escapeHtml(quotation.customer.email || '-')}</div>
        <div class="row"><span class="label">Phone:</span> ${escapeHtml(quotation.customer.phone || '-')}</div>
      </div>
      <div class="party-box">
        <div class="party-title">From</div>
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
          <th>Sample / Parameter</th>
          <th class="num" style="width:60px;">Qty</th>
          <th class="num" style="width:90px;">Unit Price</th>
          <th class="num" style="width:100px;">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${formatINR(quotation.subtotalCents)}</span></div>
      <div class="row"><span>Discount</span><span>-${formatINR(quotation.discountCents)}</span></div>
      ${quotation.gstApplicable ? `<div class="row"><span>GST @ ${Number(quotation.gstPercent).toFixed(0)}%</span><span>${formatINR(quotation.gstCents)}</span></div>` : ''}
      <div class="row grand"><span>Total</span><span>${formatINR(quotation.totalCents)}</span></div>
    </div>

    <div class="footer-grid">
      <div class="notes-box">
        <div class="title">Terms &amp; Notes</div>
        <ol>
          ${(quotation.terms || quotation.notes || 'This quotation is valid until the date shown above.')
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

module.exports = quotationHtml;
