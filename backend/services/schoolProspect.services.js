const SchoolProspect = require('../models/SchoolProspect');
const {
  submitSchoolApplicationToFlodesk,
  getSchoolSegmentId,
} = require('./flodeskService');
const { buildWhatsAppLink } = require('./whatsappLinkService');

const VALID_ROLES = ['owner', 'principal', 'coordinator', 'teacher'];
const VALID_CURRENT_ENGLISH = ['yes', 'no'];

function normalizeLanguage(language) {
  if (!language || typeof language !== 'string') return null;
  const value = language.trim().toLowerCase();
  if (['pt', 'en', 'es'].includes(value)) return value;
  return null;
}

function normalizeRole(role) {
  if (!role || typeof role !== 'string') return null;
  const value = role.trim().toLowerCase();
  if (VALID_ROLES.includes(value)) return value;
  return null;
}

function normalizeCurrentEnglish(value) {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (VALID_CURRENT_ENGLISH.includes(normalized)) return normalized;
  return null;
}

function requireNonEmptyString(value, fieldName) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

/**
 * Persist a school prospect and submit to the language-specific Flodesk segment.
 *
 * @param {Object} data
 * @returns {Promise<{ prospect: any, flodesk: any }>}
 */
async function submitSchoolProspect(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('data is required');
  }

  const schoolName = requireNonEmptyString(data.schoolName, 'schoolName');
  const cityCountry = requireNonEmptyString(data.cityCountry, 'cityCountry');
  const whatsapp = requireNonEmptyString(data.whatsapp, 'whatsapp');
  const email = requireNonEmptyString(data.email, 'email');
  const studentCount = requireNonEmptyString(data.studentCount, 'studentCount');
  const ageGroup = requireNonEmptyString(data.ageGroup, 'ageGroup');
  const interest = requireNonEmptyString(data.interest, 'interest');

  const role = normalizeRole(data.role);
  if (!role) {
    throw new Error('role is required and must be one of owner, principal, coordinator, teacher');
  }

  const currentEnglish = normalizeCurrentEnglish(data.currentEnglish);
  if (!currentEnglish) {
    throw new Error('currentEnglish is required and must be yes or no');
  }

  const language = normalizeLanguage(data.language);
  if (!language) {
    throw new Error('language is required and must be one of pt, en, es');
  }

  const segmentId = getSchoolSegmentId(language);

  const prospectToCreate = {
    schoolName,
    cityCountry,
    role,
    whatsapp,
    email: email.toLowerCase(),
    studentCount,
    ageGroup,
    currentEnglish,
    interest,
    language,
    flodeskStatus: 'pending',
    flodeskSegmentId: segmentId,
  };

  const prospect = await SchoolProspect.create(prospectToCreate);

  try {
    const flodesk = await submitSchoolApplicationToFlodesk({
      schoolName,
      cityCountry,
      role,
      whatsapp,
      email,
      studentCount,
      ageGroup,
      currentEnglish,
      interest,
      language,
    });

    const updatedProspect = await SchoolProspect.findByIdAndUpdate(
      prospect._id,
      {
        flodeskStatus: 'success',
        flodeskSubscriberId: flodesk?.id || null,
        flodeskSegmentId: segmentId,
        flodeskError: null,
      },
      { new: true }
    );

    return { prospect: updatedProspect, flodesk };
  } catch (error) {
    await SchoolProspect.findByIdAndUpdate(prospect._id, {
      flodeskStatus: 'failed',
      flodeskError: error.message || 'Flodesk submission failed',
    });
    throw error;
  }
}

function clampInt(value, { min, max, fallback }) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSchoolProspectFilter({ q, email, language, role, flodeskStatus, cityCountry }) {
  const filter = {};

  const normalizedLanguage = normalizeLanguage(language);
  if (normalizedLanguage) filter.language = normalizedLanguage;

  const normalizedRole = normalizeRole(role);
  if (normalizedRole) filter.role = normalizedRole;

  if (typeof flodeskStatus === 'string' && flodeskStatus.trim()) {
    const status = flodeskStatus.trim().toLowerCase();
    if (['pending', 'success', 'failed'].includes(status)) {
      filter.flodeskStatus = status;
    }
  }

  const cityQuery = typeof cityCountry === 'string' ? cityCountry.trim() : '';
  if (cityQuery) {
    filter.cityCountry = { $regex: escapeRegex(cityQuery), $options: 'i' };
  }

  const emailQuery = typeof email === 'string' ? email.trim() : '';
  const qQuery = typeof q === 'string' ? q.trim() : '';

  if (emailQuery) {
    filter.email = { $regex: escapeRegex(emailQuery), $options: 'i' };
  } else if (qQuery) {
    const escaped = escapeRegex(qQuery);
    filter.$or = [
      { email: { $regex: escaped, $options: 'i' } },
      { schoolName: { $regex: escaped, $options: 'i' } },
      { cityCountry: { $regex: escaped, $options: 'i' } },
      { whatsapp: { $regex: escaped, $options: 'i' } },
      { interest: { $regex: escaped, $options: 'i' } },
    ];
  }

  return filter;
}

/**
 * List school prospects for admin dashboard with pagination + search.
 *
 * @param {Object} params
 * @param {number|string} params.page
 * @param {number|string} params.limit
 * @param {string} [params.q] - search email/schoolName/cityCountry/whatsapp/interest
 * @param {string} [params.email]
 * @param {string} [params.language] - pt|en|es
 * @param {string} [params.role] - owner|principal|coordinator|teacher
 * @param {string} [params.flodeskStatus] - pending|success|failed
 * @param {string} [params.cityCountry]
 * @returns {Promise<{ items: any[], meta: any }>}
 */
async function listSchoolProspects(params = {}) {
  const page = clampInt(params.page, { min: 1, max: 1000000, fallback: 1 });
  const limit = clampInt(params.limit, { min: 1, max: 100, fallback: 20 });
  const skip = (page - 1) * limit;

  const filter = buildSchoolProspectFilter({
    q: params.q,
    email: params.email,
    language: params.language,
    role: params.role,
    flodeskStatus: params.flodeskStatus,
    cityCountry: params.cityCountry,
  });

  const [rawItems, total] = await Promise.all([
    SchoolProspect.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SchoolProspect.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const items = (rawItems || []).map((prospect) => ({
    ...prospect,
    whatsappLink: buildWhatsAppLink({
      whatsapp: prospect.whatsapp,
      parentName: prospect.schoolName,
      language: prospect.language,
    }),
  }));

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

module.exports = {
  submitSchoolProspect,
  listSchoolProspects,
  normalizeLanguage,
  normalizeRole,
  normalizeCurrentEnglish,
};
