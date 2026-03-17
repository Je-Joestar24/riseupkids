const Lead = require('../models/Leads');
const { submitInvitationToFlodesk } = require('./flodeskService');

function normalizeLanguage(language) {
  if (!language || typeof language !== 'string') return 'en';
  const value = language.trim().toLowerCase();
  if (['pt', 'en', 'es'].includes(value)) return value;
  return 'en';
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  }
  return Boolean(value);
}

/**
 * Persist a lead in MongoDB and then submit to Flodesk.
 * Does not create a user account.
 *
 * @param {Object} data
 * @param {string} data.parentName
 * @param {string} data.email
 * @param {string} data.whatsapp
 * @param {string|number} data.age
 * @param {string} data.language - pt | en | es
 * @param {boolean|string} data.consent
 * @returns {Promise<{ lead: any, flodesk: any }>}
 */
async function submitInvitationLead(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('data is required');
  }

  const {
    parentName,
    email,
    whatsapp,
    age,
    language,
    consent,
  } = data;

  if (!parentName || typeof parentName !== 'string' || !parentName.trim()) {
    throw new Error('parentName is required');
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('email is required');
  }
  if (!whatsapp || typeof whatsapp !== 'string' || !whatsapp.trim()) {
    throw new Error('whatsapp is required');
  }
  if (age == null || (typeof age !== 'string' && typeof age !== 'number')) {
    throw new Error('age is required');
  }

  const normalizedLanguage = normalizeLanguage(language);
  const normalizedConsent = normalizeBoolean(consent);

  if (normalizedConsent !== true) {
    throw new Error('consent is required');
  }

  const leadToCreate = {
    parentName: parentName.trim(),
    email: email.trim().toLowerCase(),
    whatsapp: String(whatsapp).trim(),
    age: String(age).trim(),
    language: normalizedLanguage,
    consent: normalizedConsent,
  };

  const lead = await Lead.create(leadToCreate);

  // Keep Flodesk integration behavior the same: send only allowed fields.
  const flodesk = await submitInvitationToFlodesk({
    parentName: parentName.trim(),
    email: email.trim(),
    whatsapp: String(whatsapp).trim(),
    age: String(age).trim(),
  });

  return { lead, flodesk };
}

module.exports = {
  submitInvitationLead,
  listLeads,
  normalizeLanguage,
  normalizeBoolean,
};

function clampInt(value, { min, max, fallback }) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function buildLeadFilter({ q, email, language, consent }) {
  const filter = {};

  const normalizedLanguage =
    typeof language === 'string' && ['pt', 'en', 'es'].includes(language.trim().toLowerCase())
      ? language.trim().toLowerCase()
      : null;
  if (normalizedLanguage) filter.language = normalizedLanguage;

  if (typeof consent !== 'undefined') {
    const normalizedConsent = normalizeBoolean(consent);
    filter.consent = normalizedConsent;
  }

  const emailQuery = typeof email === 'string' ? email.trim() : '';
  const qQuery = typeof q === 'string' ? q.trim() : '';

  if (emailQuery) {
    filter.email = { $regex: emailQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  } else if (qQuery) {
    const escaped = qQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { email: { $regex: escaped, $options: 'i' } },
      { parentName: { $regex: escaped, $options: 'i' } },
      { whatsapp: { $regex: escaped, $options: 'i' } },
    ];
  }

  return filter;
}

/**
 * List leads for admin dashboard with pagination + search.
 *
 * @param {Object} params
 * @param {number|string} params.page
 * @param {number|string} params.limit
 * @param {string} [params.q] - generic search over email/parentName/whatsapp
 * @param {string} [params.email] - email-specific search
 * @param {string} [params.language] - pt|en|es
 * @param {boolean|string} [params.consent] - filter by consent
 * @returns {Promise<{ items: any[], meta: any }>}
 */
async function listLeads(params = {}) {
  const page = clampInt(params.page, { min: 1, max: 1000000, fallback: 1 });
  const limit = clampInt(params.limit, { min: 1, max: 100, fallback: 20 });
  const skip = (page - 1) * limit;

  const filter = buildLeadFilter({
    q: params.q,
    email: params.email,
    language: params.language,
    consent: params.consent,
  });

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

