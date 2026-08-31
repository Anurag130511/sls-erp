const escapeHtml = require('../utils/escapeHtml');
const { formatINR } = require('../utils/money');

// Brand colors sampled from the SLS logo — same palette as the rest of
// the app (baseStyles.js), applied here directly since this template's
// letterhead-style layout is structurally different from the boxed
// vendor/ship-to layout used for Purchase Orders.
const GREEN = '#6AB33D';
const GREEN_DARK = '#4F8C2C';
const GRAY = '#D9D9D9';
const GRAY_LIGHT = '#F6FAF3';

const styles = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #222;
    margin: 0;
    padding: 0;
    font-size: 12px;
    line-height: 1.55;
  }
  .page {
    padding: 28px 42px 20px 42px;
  }

  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid ${GREEN};
    padding-bottom: 14px;
    margin-bottom: 16px;
  }
  .letterhead-logo { display: flex; align-items: center; gap: 12px; }
  .letterhead-logo img { height: 50px; }
  .letterhead-details { font-size: 10.5px; color: #444; line-height: 1.6; }
  .letterhead-details strong { color: #222; }
  .accreditation {
    font-size: 10.5px;
    font-weight: 700;
    color: ${GREEN_DARK};
    text-align: right;
    max-width: 220px;
    line-height: 1.5;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .meta-row .quote-no {
    font-size: 13px;
    font-weight: 700;
    color: ${GREEN_DARK};
  }
  .meta-row .quote-date {
    font-size: 12px;
    font-weight: 700;
    background: ${GRAY_LIGHT};
    border: 1px solid ${GRAY};
    border-radius: 4px;
    padding: 4px 12px;
  }

  .letter-box {
    border: 1px solid ${GRAY};
    border-left: 4px solid ${GREEN};
    border-radius: 4px;
    padding: 14px 18px;
    margin-bottom: 16px;
    background: #fff;
  }
  .letter-fields div { margin-bottom: 3px; }
  .letter-fields .label { font-weight: 700; color: ${GREEN_DARK}; display: inline-block; min-width: 100px; }

  .greeting { margin: 14px 0; }
  .greeting p { margin: 4px 0; }
  .greeting .greet-line { font-weight: 700; color: #222; }

  .signoff { margin: 14px 0 0 0; }
  .signoff .label { font-weight: 700; text-decoration: underline; color: ${GREEN_DARK}; }
  .signoff div { margin-top: 1px; }

  table.items {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 4px 0;
    border-radius: 4px;
    overflow: hidden;
  }
  table.items th, table.items td {
    border: 1px solid ${GRAY};
    padding: 7px 8px;
    font-size: 11px;
    text-align: center;
    vertical-align: middle;
  }
  table.items th {
    background: ${GREEN};
    color: #fff;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2px;
    font-size: 10.2px;
  }
  table.items tbody tr:nth-child(even) { background: ${GRAY_LIGHT}; }

  table.totals {
    width: 320px;
    margin-left: auto;
    border-collapse: collapse;
    margin-top: 6px;
  }
  table.totals td {
    border: 1px solid ${GRAY};
    padding: 7px 10px;
    font-size: 11.5px;
    font-weight: 600;
  }
  table.totals td.label { text-align: right; color: #444; }
  table.totals td.value { text-align: right; width: 120px; }
  table.totals tr.grand td {
    background: ${GREEN};
    color: #fff;
    font-weight: 700;
    font-size: 13px;
  }

  .signature-block {
    text-align: right;
    margin-top: 26px;
    font-size: 11px;
    color: #444;
  }
  .signature-block .title { font-weight: 700; color: ${GREEN_DARK}; margin-bottom: 3px; }

  .terms {
    margin-top: 24px;
    font-size: 10.3px;
    color: #444;
    border-top: 1px solid ${GRAY};
    padding-top: 12px;
  }
  .terms .heading {
    font-weight: 700;
    color: ${GREEN_DARK};
    margin-bottom: 5px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .terms div { margin-bottom: 2.5px; }

  .page-footer {
    margin-top: 26px;
    padding-top: 10px;
    border-top: 2px solid ${GREEN};
    font-size: 9.5px;
    color: #777;
    text-align: center;
  }

  .status-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #fff;
    background: ${GREEN_DARK};
  }
`;

function quotationHtml(quotation, org, logoDataUri) {
  const salesPersonName = quotation.salesPersonName || '';
  const salesPersonContactNo = quotation.salesPersonContactNo || '';

  // Group the flat (one-row-per-parameter) line items back into samples
  // — by sampleIndex, not sampleName, so two samples that happen to
  // share the same name are never merged by mistake. Sample Name /
  // Sample Qty. / Sample Count / (combined) Charges & Total each render
  // as one cell spanning every parameter row in that sample.
  const sorted = [...quotation.lineItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const sampleGroups = [];
  for (const li of sorted) {
    let group = sampleGroups.find((g) => g.sampleIndex === li.sampleIndex);
    if (!group) {
      group = { sampleIndex: li.sampleIndex, sampleName: li.sampleName, rows: [] };
      sampleGroups.push(group);
    }
    group.rows.push(li);
  }

  let srNo = 0;
  const rows = sampleGroups
    .map((group) => {
      const sampleRowCount = group.rows.length;

      // Further split this sample's rows into pricing sub-groups by
      // pricingGroupIndex — a sample can mix individually-priced
      // parameters with parameters that share a combined price.
      const pricingGroups = [];
      for (const li of group.rows) {
        let pg = pricingGroups.find((g) => g.pricingGroupIndex === li.pricingGroupIndex);
        if (!pg) {
          pg = { pricingGroupIndex: li.pricingGroupIndex, rows: [] };
          pricingGroups.push(pg);
        }
        pg.rows.push(li);
      }

      let sampleRowsRendered = 0;
      return pricingGroups
        .map((pg) => {
          const pgRowCount = pg.rows.length;
          const isCombined = pg.rows[0]?.isCombinedPricing;
          const pgTotalCents = pg.rows.reduce((sum, li) => sum + li.lineTotalCents, 0);

          return pg.rows
            .map((li, i) => {
              srNo++;
              const firstInSample = sampleRowsRendered === 0;
              const firstInGroup = i === 0;
              sampleRowsRendered++;

              const sampleCell = firstInSample ? `<td rowspan="${sampleRowCount}"><strong>${escapeHtml(group.sampleName)}</strong></td>` : '';
              const qtyCell = firstInSample ? `<td rowspan="${sampleRowCount}">${Number(li.sampleQty).toFixed(0)}</td>` : '';
              const countCell = firstInSample ? `<td rowspan="${sampleRowCount}">${Number(li.sampleCount).toFixed(0)}</td>` : '';

              let chargeCell;
              let totalCell;
              if (isCombined) {
                chargeCell = firstInGroup ? `<td rowspan="${pgRowCount}">${formatINR(pg.rows[0].chargesPerSampleCents)}</td>` : '';
                totalCell = firstInGroup ? `<td rowspan="${pgRowCount}"><strong>${formatINR(pgTotalCents)}</strong></td>` : '';
              } else {
                chargeCell = `<td>${formatINR(li.chargesPerSampleCents)}</td>`;
                totalCell = `<td>${formatINR(li.lineTotalCents)}</td>`;
              }

              return `
      <tr>
        <td>${srNo}</td>
        ${sampleCell}
        <td>${escapeHtml(li.parameterName)}</td>
        ${qtyCell}
        ${chargeCell}
        ${countCell}
        ${totalCell}
      </tr>`;
            })
            .join('');
        })
        .join('');
    })
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
  <div class="page">
    <div class="letterhead">
      <div class="letterhead-logo">
        <img src="${logoDataUri}" />
        <div class="letterhead-details">
          ${org.address ? `${escapeHtml(org.address)}<br/>` : ''}
          ${org.gst ? `<strong>GST No:</strong> ${escapeHtml(org.gst)}` : ''}${org.pan ? ` &nbsp; <strong>PAN:</strong> ${escapeHtml(org.pan)}` : ''}<br/>
          ${org.email ? `<strong>Email:</strong> ${escapeHtml(org.email)}` : ''}${org.phone ? ` &nbsp; <strong>Phone:</strong> ${escapeHtml(org.phone)}` : ''}
        </div>
      </div>
      <div class="accreditation">${escapeHtml(org.accreditation)}</div>
    </div>

    <div class="meta-row">
      <div class="quote-no">Quotation No: ${escapeHtml(quotation.quotationNumber)}</div>
      <div class="quote-date">Date: ${escapeHtml(quotation.issueDate)}</div>
    </div>

    <div class="letter-box">
      <div class="letter-fields">
        <div><span class="label">Company Name:</span> ${escapeHtml(quotation.customer?.name || '-')}</div>
        <div><span class="label">Contact Person:</span> ${escapeHtml(quotation.customer?.contactPerson || '')}</div>
        <div><span class="label">Email:</span> ${escapeHtml(quotation.customer?.email || '')}</div>
        <div><span class="label">Mobile No.:</span> ${escapeHtml(quotation.customer?.phone || '')}</div>
        <div><span class="label">Sub. :-</span> ${escapeHtml(quotation.subject || '')}</div>
      </div>

      <div class="greeting">
        <p>Dear Sir/Madam,</p>
        <p class="greet-line">Greetings from ${escapeHtml(org.name)}</p>
        <p>With reference to our discussion, please find below the quotation.</p>
        <p>Please get in touch with us for further clarification.</p>
      </div>

      <div class="signoff">
        <p class="label">Warm regards,</p>
        <div>${escapeHtml(org.name)}</div>
        ${salesPersonName ? `<div>${escapeHtml(salesPersonName)}</div>` : ''}
        ${salesPersonContactNo ? `<div>Mob: ${escapeHtml(salesPersonContactNo)}</div>` : ''}
      </div>
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
      <tr class="grand">
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
      <div class="heading">Terms &amp; Conditions</div>
      <div>*Validity of Quote ${escapeHtml(org.quoteValidityDays)} days.</div>
      <div>*GST shall be charged as per applicable rate, currently ${Number(quotation.gstPercent).toFixed(0)}%.</div>
      ${bankDetailsLine ? `<div>*Bank Details: Account holder name: ${escapeHtml(bankDetailsLine)}.</div>` : ''}
      ${bankAccountLine ? `<div>*${escapeHtml(bankAccountLine)}.</div>` : ''}
      <div>*Sample Should be received with written work order.</div>
      <div>*Payment Should be advanced through RTGS/NEFT.</div>
      ${quotation.terms ? quotation.terms.split('\n').filter(Boolean).map((t) => `<div>*${escapeHtml(t)}</div>`).join('') : ''}
    </div>

    ${org.footerAddress ? `<div class="page-footer">${escapeHtml(org.footerAddress)}</div>` : ''}
  </div>
  </body>
  </html>`;
}

module.exports = quotationHtml;
