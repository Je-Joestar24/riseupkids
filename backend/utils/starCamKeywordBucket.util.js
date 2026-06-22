const MAX_KEYWORD_TERMS = 12;

function normalizeTerm(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseKeywordBucketInput(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeKeywordBucket({ target, primary, terms } = {}) {
  const safePrimary = normalizeTerm(primary || target);
  const set = new Set();
  if (safePrimary) set.add(safePrimary);
  for (const term of terms || []) {
    const normalized = normalizeTerm(term);
    if (normalized) set.add(normalized);
  }
  const normalizedTerms = Array.from(set).slice(0, MAX_KEYWORD_TERMS);
  const resolvedPrimary = safePrimary || normalizedTerms[0] || '';
  if (!resolvedPrimary) {
    return { primary: null, terms: [] };
  }
  if (!normalizedTerms.includes(resolvedPrimary)) {
    normalizedTerms.unshift(resolvedPrimary);
  }
  return {
    primary: resolvedPrimary,
    terms: normalizedTerms.slice(0, MAX_KEYWORD_TERMS),
  };
}

function buildKeywordBucketFields({ target, keywordBucket } = {}) {
  const parsed = parseKeywordBucketInput(keywordBucket);
  const bucket = normalizeKeywordBucket({
    target,
    primary: parsed?.primary,
    terms: parsed?.terms,
  });
  if (!bucket.primary) return null;
  return bucket;
}

module.exports = {
  MAX_KEYWORD_TERMS,
  normalizeTerm,
  parseKeywordBucketInput,
  normalizeKeywordBucket,
  buildKeywordBucketFields,
};
