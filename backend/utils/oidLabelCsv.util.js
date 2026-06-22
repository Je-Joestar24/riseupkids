const fs = require('fs');
const path = require('path');

const DEFAULT_CSV_PATH = path.join(__dirname, '../config/oidv7-class-descriptions.csv');

function normalizeSearchKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyCustomLabelId(displayName) {
  const slug = normalizeSearchKey(displayName).replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return slug ? `custom:${slug}` : 'custom:label';
}

/**
 * Parse a single CSV line respecting quoted fields (DisplayName may contain commas).
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

/**
 * Clean DisplayName from OID CSV (strip quotes and leading apostrophe artifacts).
 * @param {string} raw
 * @returns {string}
 */
function cleanDisplayName(raw) {
  let value = String(raw || '').trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).replace(/""/g, '"');
  }
  if (value.startsWith("'")) {
    value = value.slice(1);
  }
  return value.trim();
}

/**
 * Parse OID v7 class descriptions CSV (LabelName, DisplayName).
 * @param {string} csvText
 * @returns {{ labelId: string, displayName: string, searchKey: string }[]}
 */
function parseOidLabelCsv(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const rows = [];
  const startIndex = /^LabelName\s*,\s*DisplayName\s*$/i.test(lines[0]) ? 1 : 0;

  for (let i = startIndex; i < lines.length; i += 1) {
    const parts = parseCsvLine(lines[i]);
    if (parts.length < 2) continue;

    const labelId = String(parts[0] || '').trim();
    const displayName = cleanDisplayName(parts.slice(1).join(','));
    if (!labelId || !displayName) continue;

    rows.push({
      labelId,
      displayName,
      searchKey: normalizeSearchKey(displayName),
    });
  }

  return rows;
}

/**
 * Read OID CSV from disk.
 * @param {string} [filePath]
 * @returns {{ labelId: string, displayName: string, searchKey: string }[]}
 */
function readOidLabelCsv(filePath = DEFAULT_CSV_PATH) {
  const csvText = fs.readFileSync(filePath, 'utf8');
  return parseOidLabelCsv(csvText);
}

module.exports = {
  DEFAULT_CSV_PATH,
  normalizeSearchKey,
  slugifyCustomLabelId,
  parseCsvLine,
  cleanDisplayName,
  parseOidLabelCsv,
  readOidLabelCsv,
};
