/**
 * Google reCAPTCHA v3 server-side verification, for the two public lead-capture forms (parent
 * invitation, school application). No SDK needed — a plain call to Google's verify endpoint,
 * mirroring hibp.service.js's pattern.
 *
 * Unlike hibp.service.js (which fails OPEN — a breached-password check being unreachable must
 * not block a real user), this fails CLOSED: a bot-protection check that silently passes whenever
 * it can't reach Google, or whenever the secret isn't configured, would defeat its own purpose.
 * Every non-success outcome rejects the submission.
 * @see https://developers.google.com/recaptcha/docs/v3
 */
const axios = require('axios');
const logger = require('../config/logger');

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const DEFAULT_SCORE_THRESHOLD = 0.5;

function getScoreThreshold() {
  const raw = Number.parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : DEFAULT_SCORE_THRESHOLD;
}

/**
 * @param {string} token - the client-supplied g-recaptcha-response token
 * @param {string} [expectedAction] - the action name passed to grecaptcha.execute() client-side;
 *   when given, a mismatched action (e.g. a token minted for a different form/page) is rejected
 * @returns {Promise<{ verified: boolean, score: number|null, reason: string|null }>}
 */
async function verifyCaptcha(token, expectedAction) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    logger.error('[Captcha] RECAPTCHA_SECRET_KEY is not configured');
    return { verified: false, score: null, reason: 'not_configured' };
  }
  if (!token || typeof token !== 'string' || !token.trim()) {
    return { verified: false, score: null, reason: 'missing_token' };
  }

  let data;
  try {
    const res = await axios.post(
      RECAPTCHA_VERIFY_URL,
      new URLSearchParams({ secret, response: token.trim() }).toString(),
      { timeout: 5000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    data = res.data;
  } catch (err) {
    logger.warn({ err: err.message }, '[Captcha] Verification request failed');
    return { verified: false, score: null, reason: 'verification_request_failed' };
  }

  if (!data?.success) {
    const reason = Array.isArray(data?.['error-codes']) ? data['error-codes'].join(',') : 'rejected';
    return { verified: false, score: null, reason };
  }

  if (expectedAction && data.action !== expectedAction) {
    return { verified: false, score: typeof data.score === 'number' ? data.score : null, reason: 'action_mismatch' };
  }

  const score = typeof data.score === 'number' ? data.score : null;
  if (score === null || score < getScoreThreshold()) {
    return { verified: false, score, reason: 'low_score' };
  }

  return { verified: true, score, reason: null };
}

module.exports = { verifyCaptcha, getScoreThreshold };
