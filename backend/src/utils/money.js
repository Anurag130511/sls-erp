// All money is stored as integer paise (cents) in the DB to avoid float
// rounding errors. These helpers convert to/from the rupee amounts the
// frontend and PDF templates display.

function toCents(rupees) {
  return Math.round(Number(rupees) * 100);
}

function toRupees(cents) {
  return Number(cents) / 100;
}

function formatINR(cents) {
  const rupees = toRupees(cents);
  return rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = { toCents, toRupees, formatINR };
