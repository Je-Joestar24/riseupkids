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
  normalizeLanguage,
  normalizeBoolean,
};

