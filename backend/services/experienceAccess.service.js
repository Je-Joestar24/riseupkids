/**
 * Access control for the free "Smoothie Experience" page (/experiencia on the sales site).
 *
 * The page is only for people who signed up (and confirmed their email) through the Flodesk freebie
 * form. Two rules shape everything here:
 *  1. The video links live ONLY on the server and are returned only after the email check passes —
 *     they are never in the page's code, so copying the page link, or reading the page source,
 *     gets a visitor nothing.
 *  2. Nothing that unlocks the page is ever put in a URL. After a successful check the browser
 *     keeps a signed token in its own storage, so the same device doesn't have to retype the email.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getSubscriberByEmail, getFreebieSegmentId } = require('./flodeskService');

const SUPPORTED_LANGUAGES = ['pt', 'es'];
const BUNNY_EMBED_HOSTS = ['player.mediadelivery.net', 'iframe.mediadelivery.net'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

/** @returns {'pt'|'es'} anything that isn't Spanish is Portuguese, matching the site's default. */
function normalizeExperienceLanguage(language) {
  return String(language || '').trim().toLowerCase() === 'es' ? 'es' : 'pt';
}

/** @returns {string|null} the lowercased, trimmed email, or null if it isn't a plausible address. */
function normalizeEmail(email) {
  if (typeof email !== 'string') return null;
  const value = email.trim().toLowerCase();
  if (!value || value.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(value)) return null;
  return value;
}

/**
 * Derived from JWT_SECRET but not equal to it, so a token minted here can never be accepted as a
 * login session (and a login token can never pass as page access), even though they share a root.
 */
function getTokenSecret() {
  const root = process.env.JWT_SECRET;
  if (!root) {
    throw new Error('JWT_SECRET is not configured');
  }
  return crypto.createHmac('sha256', root).update('experience-access-v1').digest('hex');
}

/** Signed, language-bound, expiring token. Carries no personal data — not even the email. */
function issueExperienceToken(language) {
  return jwt.sign(
    { purpose: 'experience', lang: normalizeExperienceLanguage(language) },
    getTokenSecret(),
    { expiresIn: process.env.EXPERIENCE_TOKEN_EXPIRE || '30d' }
  );
}

/** @returns {boolean} true only for an untampered, unexpired token issued for THIS language. */
function verifyExperienceToken(token, language) {
  if (!token || typeof token !== 'string') return false;
  try {
    const decoded = jwt.verify(token, getTokenSecret());
    return (
      decoded.purpose === 'experience' && decoded.lang === normalizeExperienceLanguage(language)
    );
  } catch {
    return false;
  }
}

/**
 * Whether this email is a confirmed ("active") Flodesk subscriber in the freebie segment for the
 * language. An unconfirmed, unsubscribed, bounced, or differently-segmented subscriber is "no".
 *
 * @returns {Promise<boolean>}
 * @throws if the check could not be performed (Flodesk unreachable, segment not configured) —
 *   which is deliberately NOT the same as answering "no".
 */
async function emailHasExperienceAccess(email, language) {
  const segmentId = getFreebieSegmentId(normalizeExperienceLanguage(language));
  const subscriber = await getSubscriberByEmail(email);
  if (!subscriber) return false;

  const isConfirmed = String(subscriber.status || '').toLowerCase() === 'active';
  const inFreebieSegment =
    Array.isArray(subscriber.segments) &&
    subscriber.segments.some((segment) => String(segment?.id) === segmentId);

  return isConfirmed && inFreebieSegment;
}

/**
 * The embed links for the language, read from EXPERIENCE_VIDEOS_PT / EXPERIENCE_VIDEOS_ES
 * (comma-separated). Spanish falls back to the Portuguese list if it has none of its own. Only
 * https Bunny player URLs are ever returned, so a typo or a wrong paste in the settings can't
 * turn the page into an iframe for some other site.
 *
 * @returns {string[]}
 */
function getExperienceVideos(language) {
  const lang = normalizeExperienceLanguage(language);
  const own = process.env[`EXPERIENCE_VIDEOS_${lang.toUpperCase()}`];
  const raw = own && own.trim() ? own : process.env.EXPERIENCE_VIDEOS_PT || '';

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && BUNNY_EMBED_HOSTS.includes(url.hostname);
      } catch {
        return false;
      }
    });
}

module.exports = {
  normalizeExperienceLanguage,
  normalizeEmail,
  issueExperienceToken,
  verifyExperienceToken,
  emailHasExperienceAccess,
  getExperienceVideos,
};
