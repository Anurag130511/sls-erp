const escapeHtml = require('../utils/escapeHtml');
const { formatINR } = require('../utils/money');

// This template intentionally does NOT reuse baseStyles.js — it matches
// the lab's real letterhead-style quotation format (a specific reference
// PDF was provided), which looks quite different from the boxed
// vendor/ship-to layout used for Purchase Orders.
const styles = `
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1A1A1A;
    margin: 0;
    padding: 30px 40px;
    font-size: 12px;
    line-height: 1.5;
  }
  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #333;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .letterhead .company-name { font-weight: 700; font-size: 13px; }
  .letterhead .accreditation { font-size: 11px; }
  .letterhead .accreditation a { color: #1a56db; }
  .letterhead-body { flex: 1; }
  .letterhead-logo { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
  .letterhead-logo img { height: 46px; }
  .letterhead-details { font-size: 10.5px; color: #333; }
  .letterhead-details a { color: #1a56db; }

  .meta-row {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .letter-fields div { margin-bottom: 2px; }
  .letter-fields .label { font-weight: 700; }

  .greeting { margin: 14px 0; }
  .greeting p { margin: 4px 0; }

  .signoff { margin: 14px 0; }
  .signoff .label { text-decoration: underline; }

  table.items {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
  }
  table.items th, table.items td {
    border: 1px solid #999;
    padding: 6px 8px;
    font-size: 11px;
  }
  table.items th {
    background: #cfe8ef;
    font-weight: 700;
    text-align: center;
  }
  table.items td.num { text-align: right; }
  table.items td.center { text-align: center; }

  table.totals {
    width: 100%;
    border-collapse: collapse;
    margin-top: -1px;
  }
  table.totals td {
    border: 1px solid #999;
    padding: 6px 8px;
    font-size: 11.5px;
    font-weight: 700;
  }
  table.totals td.label { text-align: right; }
  table.totals td.value { text-align: right; width: 140px; }

  .signature-block {
    text-align: right;
    margin-top: 24px;
    font-size: 11px;
  }
  .signature-block .title { font-weight: 700; }

  .terms {
    margin-top: 26px;
    font-size: 10.5px;
  }
  .terms .heading { font-weight: 700; margin-bottom: 4px; }
  .terms div { margin-bottom: 2px; }

  .page-footer {
    margin-top: 30px;
    padding-top: 8px;
    border-top: 1px solid #ccc;
    font-size: 9.5px;
    color: #555;
    text-align: center;
  }

  .status-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #fff;
    background: #4F8C2C;
  }
`;

function quotationHtml(quotation, org, logoDataUri) {
  const salesPersonName = quotation.salesPersonName || '';
  const salesPersonContactNo = quotation.salesPersonContactNo || '';

  const rows = [...quotation.lineItems]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (li, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(li.sampleName)}</td>
        <td>${escapeHtml(li.parametersText)}</td>
        <td class="num">${Number(li.sampleQty).toFixed(0)}</td>
        <td class="num">${formatINR(li.chargesPerSampleCents)}</td>
        <td class="num">${Number(li.sampleCount).toFixed(0)}</td>
        <td class="num">${formatINR(li.lineTotalCents)}</td>
      </tr>`
    )
    .join('');

  const bankDetailsLine = [org.bankAccountName, org.bankName].filter(Boolean).join(', ');
  const bankAccountLine = [
    org.bankAccountNo ? `A/C no- ${org.bankAccountNo}` : '',
    org.bankBranch ? `Branch name: ${org.bankBranch}` : '',
    org.bankIfsc ? `IFSC- ${org.bankIfsc}` : '',
  ].filter(Boolean).join(', ');

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>${styles}</style>
  </head>
  <body>
    <div class="letterhead">
      <div class="letterhead-body">
        <div class="company-name">${escapeHtml(org.name.toUpperCase())}</div>
        <div class="letterhead-logo">
          <img src="${logoDataUri}" />
          <div class="letterhead-details">
            ${org.address ? `${escapeHtml(org.address)}<br/>` : ''}
            ${org.gst ? `GST No: ${escapeHtml(org.gst)}` : ''}${org.pan ? `, PAN NO: ${escapeHtml(org.pan)}` : ''}<br/>
            ${org.email ? `Email- ${escapeHtml(org.email)}` : ''}${org.phone ? `, Phone no: ${escapeHtml(org.phone)}` : ''}
          </div>
        </div>
      </div>
      <div class="accreditation">${escapeHtml(org.accreditation)}</div>
    </div>

    <div class="meta-row">
      <div>Quotation No: ${escapeHtml(quotation.quotationNumber)}</div>
      <div>Date: ${escapeHtml(quotation.issueDate)}</div>
    </div>

    <div class="letter-fields">
      <div><span class="label">Company Name:</span> ${escapeHtml(quotation.customer?.name || '-')}</div>
      <div><span class="label">Contact Person:</span> ${escapeHtml(quotation.customer?.contactPerson || '')}</div>
      <div><span class="label">Email:</span> ${escapeHtml(quotation.customer?.email || '')}</div>
      <div><span class="label">Mobile No.:</span> ${escapeHtml(quotation.customer?.phone || '')}</div>
      <div><span class="label">Sub. :-</span> ${escapeHtml(quotation.subject || '')}</div>
    </div>

    <div class="greeting">
      <p>Dear Sir/Madam,</p>
      <p><strong>Greetings from ${escapeHtml(org.name)}.</strong></p>
      <p>With reference to our discussion, please find below the quotation.</p>
      <p>Please get in touch with us for further clarification.</p>
    </div>

    <div class="signoff">
      <p class="label">Warm regards,</p>
      <div>${escapeHtml(org.name)}</div>
      ${salesPersonName ? `<div>${escapeHtml(salesPersonName)}</div>` : ''}
      ${salesPersonContactNo ? `<div>Mob: ${escapeHtml(salesPersonContactNo)}</div>` : ''}
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:32px;">Sr. No.</th>
          <th>Sample Name</th>
          <th>Parameters</th>
          <th style="width:70px;">Sample Qty.</th>
          <th style="width:90px;">Charges/ Sample</th>
          <th style="width:80px;">Sample count</th>
          <th style="width:90px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <table class="totals">
      <tr>
        <td class="label" colspan="6">Total</td>
        <td class="value">${formatINR(quotation.subtotalCents - quotation.discountCents)}</td>
      </tr>
      ${quotation.discountCents > 0 ? `
      <tr>
        <td class="label" colspan="6">Discount</td>
        <td class="value">-${formatINR(quotation.discountCents)}</td>
      </tr>` : ''}
      ${quotation.gstApplicable ? `
      <tr>
        <td class="label" colspan="6">GST ${Number(quotation.gstPercent).toFixed(0)}%</td>
        <td class="value">${formatINR(quotation.gstCents)}</td>
      </tr>` : ''}
      <tr>
        <td class="label" colspan="6">Grand Total</td>
        <td class="value">${formatINR(quotation.totalCents)}</td>
      </tr>
    </table>

    <div class="signature-block">
      <div class="title">Authorized Signatory</div>
      <div>${escapeHtml(org.name)}</div>
      ${org.address ? `<div>${escapeHtml(org.address)}</div>` : ''}
    </div>

    <div class="terms">
      <div class="heading">Terms &amp; Conditions:</div>
      <div>*Validity of Quote ${escapeHtml(org.quoteValidityDays)} days.</div>
      <div>*GST shall be charged as per applicable rate, currently ${Number(quotation.gstPercent).toFixed(0)}%.</div>
      ${bankDetailsLine ? `<div>*Bank Details: Account holder name: ${escapeHtml(bankDetailsLine)}.</div>` : ''}
      ${bankAccountLine ? `<div>*${escapeHtml(bankAccountLine)}.</div>` : ''}
      <div>*Sample Should be received with written work order.</div>
      <div>*Payment Should be advanced through RTGS/NEFT.</div>
      ${quotation.terms ? quotation.terms.split('\n').filter(Boolean).map((t) => `<div>*${escapeHtml(t)}</div>`).join('') : ''}
    </div>

    ${org.footerAddress ? `<div class="page-footer">${escapeHtml(org.footerAddress)}</div>` : ''}
  </body>
  </html>`;
}

module.exports = quotationHtml;
