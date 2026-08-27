const XLSX = require('xlsx');

/**
 * Parses an uploaded workbook buffer into an array of row objects, keyed
 * by the header row (first row of the first sheet). Header matching is
 * case-insensitive and ignores surrounding whitespace, so "GST No",
 * "gst no", and " GST No " all map to the same field once passed through
 * a column alias map by the caller.
 */
function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  // defval: '' ensures blank cells come through as '' instead of being
  // omitted from the row object entirely, which keeps row shape consistent.
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

/**
 * Normalizes a raw parsed row into the model's field names using an alias
 * map, e.g. { name: ['name', 'company name'], gstNo: ['gst no', 'gst'] }.
 * Returns an object with only the mapped fields.
 */
function mapRow(row, aliasMap) {
  const normalizedRow = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[String(key).trim().toLowerCase()] = typeof value === 'string' ? value.trim() : value;
  }

  const mapped = {};
  for (const [field, aliases] of Object.entries(aliasMap)) {
    for (const alias of aliases) {
      const normalizedAlias = alias.toLowerCase();
      if (normalizedRow[normalizedAlias] !== undefined && normalizedRow[normalizedAlias] !== '') {
        mapped[field] = normalizedRow[normalizedAlias];
        break;
      }
    }
  }
  return mapped;
}

/**
 * Builds a downloadable template workbook (header row + one example row)
 * so users know the expected column names before uploading.
 */
function buildTemplateBuffer(headers, exampleRow) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { parseWorkbook, mapRow, buildTemplateBuffer };
