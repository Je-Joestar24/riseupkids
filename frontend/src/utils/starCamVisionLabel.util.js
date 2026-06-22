export const ADD_CUSTOM_OPTION_PREFIX = '__add_custom__:';

export function normalizeVisionTarget(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toLabelSelection(label) {
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

export function buildAddCustomOption(query) {
  const trimmed = String(query || '').trim();
  return {
    labelId: `${ADD_CUSTOM_OPTION_PREFIX}${trimmed}`,
    displayName: trimmed,
    source: 'custom',
    isAddCustom: true,
  };
}

export function toAutocompleteOption(selection) {
  if (!selection) return null;
  const displayName = String(selection.displayName || selection.target || '').trim();
  const target = normalizeVisionTarget(selection.target || displayName);
  if (!target) return null;
  return {
    labelId: selection.labelId || null,
    displayName: displayName || target,
    target,
    source: selection.source || 'oidv7',
    defaultTerms: Array.isArray(selection.defaultTerms) ? selection.defaultTerms : [],
    optionKey: selection.labelId ? `${selection.source || 'oidv7'}:${selection.labelId}` : `term:${target}`,
  };
}

export function selectionsFromKeywordBucket(vocab = {}) {
  const terms =
    Array.isArray(vocab?.keywordBucket?.terms) && vocab.keywordBucket.terms.length
      ? vocab.keywordBucket.terms
      : vocab?.target
        ? [vocab.target]
        : [];

  return terms
    .map((term, index) =>
      toAutocompleteOption({
        labelId: index === 0 ? vocab?.labelId || null : null,
        displayName: term,
        target: term,
        source: index === 0 ? vocab?.labelSource || 'oidv7' : 'oidv7',
      })
    )
    .filter(Boolean);
}

export function buildKeywordPayloadFromSelections(selections = []) {
  const options = selections.map(toAutocompleteOption).filter(Boolean);
  const terms = [];
  const seen = new Set();

  for (const option of options) {
    if (!seen.has(option.target)) {
      seen.add(option.target);
      terms.push(option.target);
    }
    for (const extra of option.defaultTerms || []) {
      const normalized = normalizeVisionTarget(extra);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        terms.push(normalized);
      }
    }
  }

  const primary = terms[0] || '';
  const first = options[0] || null;

  return {
    target: primary,
    labelId: first?.labelId || null,
    labelSource: first?.source || null,
    targetLabels: options,
    keywordBucket: {
      primary,
      terms: terms.slice(0, 12),
    },
  };
}
