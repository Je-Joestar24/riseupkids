/**
 * Flodesk API integration service.
 * No Express dependency - can be unit tested independently.
 *
 * Uses Flodesk REST API:
 * - Base URL: from env FLODESK_BASE_URL (default https://api.flodesk.com/v1)
 * - Segment: from env SUBSCRIBED_FORM_ID or FLODESK_SEGMENT_ID (must be the SEGMENT id, not the form id)
 * - Auth: Basic (API key as username, empty password)
 * - Create/update subscriber: POST /subscribers with segment_ids so they appear in the same segment as form submissions
 *
 * Important: Form ID ≠ Segment ID. Your form (e.g. riseupkids.myflodesk.com/xxx) adds subscribers
 * to a segment. Use that segment's ID here. Run: node scripts/listFlodeskSegments.js to list segment IDs.
 */

const axios = require('axios');

const getBaseUrl = () => process.env.FLODESK_BASE_URL || 'https://api.flodesk.com/v1';
const getSegmentId = () =>
  process.env.FLODESK_SEGMENT_ID || process.env.SUBSCRIBED_FORM_ID;
const getInvitationSegmentId = () => process.env.INVITATION_FORM_ID;

const SCHOOL_SEGMENT_ENV_KEYS = {
  en: 'FLODESK_SCHOOL_SEGMENT_EN',
  es: 'FLODESK_SCHOOL_SEGMENT_ES',
  pt: 'FLODESK_SCHOOL_SEGMENT_PT',
};

/**
 * Resolve Flodesk segment ID for school applications by language.
 *
 * @param {string} language - pt | en | es
 * @returns {string} Segment ID from env
 * @throws {Error} If language is invalid or env var is missing
 */
function getSchoolSegmentId(language) {
  const lang = (language || '').toString().trim().toLowerCase();
  const envKey = SCHOOL_SEGMENT_ENV_KEYS[lang];
  if (!envKey) {
    throw new Error('language must be one of pt, en, es');
  }

  const segmentId = process.env[envKey];
  if (!segmentId || !segmentId.trim()) {
    throw new Error(`${envKey} environment variable is not set`);
  }

  return segmentId.trim();
}

/**
 * Split a full name into first_name and last_name.
 * First word = first_name; remaining words = last_name.
 * If only one word, first_name = that word, last_name = ''.
 *
 * @param {string} parentName - Full name (e.g. "Jejomar Parrilla" or "Madonna")
 * @returns {{ first_name: string, last_name: string }}
 */
function splitParentName(parentName) {
  if (parentName == null || typeof parentName !== 'string') {
    return { first_name: '', last_name: '' };
  }
  const parts = parentName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  };
}

/**
 * Subscribe an email to Flodesk (create or update subscriber and add to segment).
 * Only email is required. Uses SEGMENT ID (not form ID) so the subscriber appears in the same
 * segment as when they submit your form, and can trigger segment-based workflows (e.g. confirmation).
 *
 * @param {string} email - Subscriber email
 * @returns {Promise<Object>} Flodesk API response (subscriber object)
 * @throws {Error} If FLODESK_API_KEY or segment ID is missing or API request fails
 */
async function subscribeToFlodesk(email) {
  const apiKey = process.env.FLODESK_API_KEY;
  if (!apiKey) {
    throw new Error('FLODESK_API_KEY environment variable is not set');
  }

  const segmentId = getSegmentId();
  if (!segmentId || !segmentId.trim()) {
    throw new Error(
      'SUBSCRIBED_FORM_ID or FLODESK_SEGMENT_ID environment variable is not set (use the segment ID, not the form ID; run node scripts/listFlodeskSegments.js to list segments)'
    );
  }

  if (!email || typeof email !== 'string') {
    throw new Error('email is required and must be a non-empty string');
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error('email cannot be empty');
  }

  const payload = {
    email: trimmedEmail,
    segment_ids: [segmentId.trim()],
    double_optin: true,
  };

  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  const baseUrl = getBaseUrl().replace(/\/$/, '');

  try {
    const response = await axios.post(`${baseUrl}/subscribers`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        'User-Agent': 'Rise Up Kids (https://riseupkids.com)',
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data;
      const message = data?.message || data?.error || err.message;
      console.error('[Flodesk] API error:', {
        status,
        message,
        email: trimmedEmail,
        responseData: data,
      });
      throw new Error(
        `Flodesk subscription failed: ${message || `HTTP ${status}`}`
      );
    }
    console.error('[Flodesk] Unexpected error:', err.message);
    throw err;
  }
}

/**
 * Submit sales page invitation to Flodesk (invitation form/segment).
 * Does NOT create a user account; only sends data to Flodesk.
 * Name splitting (parentName → first_name, last_name) is done in this service.
 *
 * @param {Object} data - Invitation data from sales page
 * @param {string} data.parentName - Parent full name (split into first_name, last_name)
 * @param {string} data.email - Email
 * @param {string} data.whatsapp - WhatsApp number
 * @param {string} data.age - Child's age
 * @returns {Promise<Object>} Flodesk API response (subscriber object)
 * @throws {Error} If required env or fields are missing or API request fails
 */
async function submitInvitationToFlodesk(data) {
  const apiKey = process.env.FLODESK_API_KEY;
  if (!apiKey) {
    throw new Error('FLODESK_API_KEY environment variable is not set');
  }

  const segmentId = getInvitationSegmentId();
  if (!segmentId || !segmentId.trim()) {
    throw new Error(
      'INVITATION_FORM_ID environment variable is not set (use the segment ID for the invitation form)'
    );
  }

  const { parentName, email, whatsapp, age } = data || {};
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('email is required and must be a non-empty string');
  }

  const { first_name, last_name } = splitParentName(parentName);

  const payload = {
    email: email.trim(),
    first_name,
    last_name,
    segment_ids: [segmentId.trim()],
    double_optin: true,
    custom_fields: {},
  };
  if (whatsapp != null && String(whatsapp).trim() !== '') {
    payload.custom_fields.whatsapp = String(whatsapp).trim();
  }
  if (age != null && String(age).trim() !== '') {
    payload.custom_fields.age = String(age).trim();
  }

  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  const baseUrl = getBaseUrl().replace(/\/$/, '');

  try {
    const response = await axios.post(`${baseUrl}/subscribers`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        'User-Agent': 'Rise Up Kids (https://riseupkids.com)',
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const resData = err.response?.data;
      const message = resData?.message || resData?.error || err.message;
      console.error('[Flodesk] Invitation API error:', {
        status,
        message,
        email: email.trim(),
        responseData: resData,
      });
      throw new Error(
        `Flodesk invitation failed: ${message || `HTTP ${status}`}`
      );
    }
    console.error('[Flodesk] Invitation unexpected error:', err.message);
    throw err;
  }
}

/**
 * Submit schools page application to Flodesk.
 * Segment is chosen by language so one form can trigger EN/ES/PT workflows.
 *
 * @param {Object} data
 * @param {string} data.schoolName
 * @param {string} data.cityCountry
 * @param {string} data.role
 * @param {string} data.whatsapp
 * @param {string} data.email
 * @param {string} data.studentCount
 * @param {string} data.ageGroup
 * @param {string} data.currentEnglish
 * @param {string} data.interest
 * @param {string} data.language - pt | en | es
 * @returns {Promise<Object>} Flodesk API response (subscriber object)
 */
async function submitSchoolApplicationToFlodesk(data) {
  const apiKey = process.env.FLODESK_API_KEY;
  if (!apiKey) {
    throw new Error('FLODESK_API_KEY environment variable is not set');
  }

  const {
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
  } = data || {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('email is required and must be a non-empty string');
  }

  const segmentId = getSchoolSegmentId(language);
  const { first_name, last_name } = splitParentName(schoolName);

  const payload = {
    email: email.trim(),
    first_name,
    last_name,
    segment_ids: [segmentId],
    double_optin: true,
    custom_fields: {},
  };

  const customFields = payload.custom_fields;
  if (schoolName != null && String(schoolName).trim() !== '') {
    customFields.school_name = String(schoolName).trim();
  }
  if (cityCountry != null && String(cityCountry).trim() !== '') {
    customFields.city_country = String(cityCountry).trim();
  }
  if (role != null && String(role).trim() !== '') {
    customFields.role = String(role).trim();
  }
  if (whatsapp != null && String(whatsapp).trim() !== '') {
    customFields.whatsapp = String(whatsapp).trim();
  }
  if (studentCount != null && String(studentCount).trim() !== '') {
    customFields.student_count = String(studentCount).trim();
  }
  if (ageGroup != null && String(ageGroup).trim() !== '') {
    customFields.age_group = String(ageGroup).trim();
  }
  if (currentEnglish != null && String(currentEnglish).trim() !== '') {
    customFields.current_english = String(currentEnglish).trim();
  }
  if (interest != null && String(interest).trim() !== '') {
    customFields.interest = String(interest).trim();
  }
  if (language != null && String(language).trim() !== '') {
    customFields.language = String(language).trim().toLowerCase();
  }

  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  const baseUrl = getBaseUrl().replace(/\/$/, '');

  try {
    const response = await axios.post(`${baseUrl}/subscribers`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        'User-Agent': 'Rise Up Kids (https://riseupkids.com)',
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const resData = err.response?.data;
      const message = resData?.message || resData?.error || err.message;
      console.error('[Flodesk] School application API error:', {
        status,
        message,
        email: email.trim(),
        language,
        segmentId,
        responseData: resData,
      });
      throw new Error(
        `Flodesk school application failed: ${message || `HTTP ${status}`}`
      );
    }
    console.error('[Flodesk] School application unexpected error:', err.message);
    throw err;
  }
}

/** Alias for clarity when used for signup form. */
async function subscribeSignupToFlodesk(email) {
  return subscribeToFlodesk(email);
}

module.exports = {
  subscribeToFlodesk,
  subscribeSignupToFlodesk,
  submitInvitationToFlodesk,
  submitSchoolApplicationToFlodesk,
  getSchoolSegmentId,
  splitParentName,
};
