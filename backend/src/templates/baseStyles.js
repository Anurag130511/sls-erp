// Colors sampled directly from the SLS logo:
//   green  #6AB33D  (flask icon, "Sciences" wordmark, section accents)
//   gray   #D1CECE  (thin divider next to "Shoolini Life")
//   black  #000000  (body text, "SLS" wordmark)
const BRAND = {
  green: '#6AB33D',
  greenDark: '#4F8C2C',
  gray: '#D1CECE',
  grayLight: '#F4F4F4',
  black: '#1A1A1A',
};

const baseStyles = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: ${BRAND.black};
    margin: 0;
    padding: 36px 44px;
    font-size: 12px;
    line-height: 1.5;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid ${BRAND.green};
    padding-bottom: 16px;
    margin-bottom: 18px;
  }
  .header-left img { height: 56px; }
  .header-right { text-align: right; }
  .doc-title {
    font-size: 26px;
    font-weight: 700;
    color: ${BRAND.green};
    margin: 0 0 6px 0;
    letter-spacing: 0.5px;
  }
  .doc-meta { font-size: 12px; color: ${BRAND.black}; }
  .doc-meta strong { color: ${BRAND.greenDark}; }
  .org-line { font-size: 10.5px; color: #555; margin-top: 4px; }

  .parties {
    display: flex;
    gap: 24px;
    margin-bottom: 18px;
  }
  .party-box {
    flex: 1;
    border: 1px solid ${BRAND.gray};
    border-radius: 4px;
    padding: 12px 14px;
  }
  .party-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #fff;
    background: ${BRAND.green};
    display: inline-block;
    padding: 3px 10px;
    border-radius: 3px;
    margin-bottom: 8px;
    font-weight: 700;
  }
  .party-box .name { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
  .party-box .row { margin-bottom: 2px; color: #333; }
  .party-box .label { color: #777; }

  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
  }
  table.items thead th {
    background: ${BRAND.green};
    color: #fff;
    text-align: left;
    padding: 8px 10px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  table.items thead th.num { text-align: right; }
  table.items tbody td {
    padding: 8px 10px;
    border-bottom: 1px solid ${BRAND.gray};
    font-size: 11.5px;
    vertical-align: top;
  }
  table.items tbody td.num { text-align: right; white-space: nowrap; }
  table.items tbody tr:nth-child(even) { background: ${BRAND.grayLight}; }

  .totals {
    width: 320px;
    margin-left: auto;
    margin-top: 10px;
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    padding: 6px 10px;
    font-size: 12px;
  }
  .totals .row.grand {
    background: ${BRAND.green};
    color: #fff;
    font-weight: 700;
    font-size: 13.5px;
    border-radius: 3px;
    margin-top: 4px;
  }

  .footer-grid {
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
    gap: 24px;
  }
  .notes-box {
    flex: 1;
    font-size: 10.5px;
    color: #444;
  }
  .notes-box .title {
    font-weight: 700;
    color: ${BRAND.greenDark};
    margin-bottom: 6px;
    font-size: 11px;
    text-transform: uppercase;
  }
  .notes-box ol { margin: 0; padding-left: 16px; }
  .notes-box li { margin-bottom: 4px; }

  .signature-box {
    width: 220px;
    text-align: center;
    font-size: 10.5px;
  }
  .signature-line {
    border-top: 1px solid #999;
    margin-top: 40px;
    padding-top: 6px;
    color: #555;
  }

  .status-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #fff;
    background: ${BRAND.greenDark};
  }
`;

module.exports = { BRAND, baseStyles };
