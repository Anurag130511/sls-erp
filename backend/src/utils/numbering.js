const { sequelize, Counter } = require('../models');

/**
 * Returns the current Indian financial year label, e.g. "26-27" for
 * any date between 1 Apr 2026 and 31 Mar 2027. Adjust here if your
 * organization uses a calendar year instead.
 */
function financialYearLabel(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  const shortStart = String(startYear).slice(-2);
  const shortEnd = String(startYear + 1).slice(-2);
  return `${shortStart}-${shortEnd}`;
}

/**
 * Atomically increments and returns the next number for a given document
 * type + financial year, e.g. nextNumber('PO') -> 24 for SLS/26-27/024P.
 * Runs inside a transaction with a row lock so two simultaneous requests
 * can never be handed the same number.
 */
async function nextNumber(prefixKey) {
  const fy = financialYearLabel();
  const key = `${prefixKey}-${fy}`;

  return sequelize.transaction(async (t) => {
    const [counter] = await Counter.findOrCreate({
      where: { key },
      defaults: { value: 0 },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    counter.value += 1;
    await counter.save({ transaction: t });
    return { sequence: counter.value, fy };
  });
}

/**
 * Formats a Purchase Order number in the SLS/26-27/024P style seen on
 * the reference template. `orgCode` defaults to SLS but is configurable.
 */
async function nextPONumber(orgCode = 'SLS') {
  const { sequence, fy } = await nextNumber('PO');
  const padded = String(sequence).padStart(3, '0');
  return `${orgCode}/${fy}/${padded}P`;
}

/**
 * Formats a Quotation number, e.g. SLS/26-27/QT-014.
 */
async function nextQuotationNumber(orgCode = 'SLS') {
  const { sequence, fy } = await nextNumber('QT');
  const padded = String(sequence).padStart(3, '0');
  return `${orgCode}/${fy}/QT-${padded}`;
}

module.exports = { nextPONumber, nextQuotationNumber, financialYearLabel };
