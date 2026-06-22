const ADD_CUSTOM_OPTION_PREFIX = '__add_custom__:';

function normalizeVisionTarget(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toLabelSelection(label) {
  if (!label || typeof label !== 'object') return null;
  const displayName = String(label.displayName || '').trim();
  if (!displayName) return null;
  return {
    labelId: label.labelId || null,
    displayName,
    target: normalizeVisionTarget(label.searchKey || displayName),
    source: label.source || 'oidv7',
    defaultTerms: Array.isArray(label.defaultTerms) ? label.defaultTerms : [],
  };
}

function buildAddCustomOption(query) {
  const trimmed = String(query || '').trim();
  return {
    labelId: `${ADD_CUSTOM_OPTION_PREFIX}${trimmed}`,
    displayName: trimmed,
    source: 'custom',
    isAddCustom: true,
  };
}

module.exports = {
  ADD_CUSTOM_OPTION_PREFIX,
  normalizeVisionTarget,
  toLabelSelection,
  buildAddCustomOption,
};
