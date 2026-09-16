/**
 * HaveIBeenPwned breached-password check (Chunk 10), via the k-anonymity range API — only the
 * first 5 hex characters of the password's SHA-1 hash are ever sent, so the actual password (or
 * even its full hash) never leaves the server. Free, no API key.
 * @see https://haveibeenpwned.com/API/v3#PwnedPasswords
 */
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../config/logger');

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';

/**
 * @param {string} password
 * @returns {Promise<boolean>} true if the password appears in a known breach corpus. Fails
 *   open (returns false) if the HIBP API is unreachable — an external dependency being down
 *   must not block registration/password changes.
 */
async function isPasswordBreached(password) {
  const sha1 = crypto.createHash('sha1').update(String(password), 'utf8').digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await axios.get(`${HIBP_RANGE_URL}${prefix}`, {
      timeout: 5000,
      headers: { 'Add-Padding': 'true' },
    });
    const lines = String(res.data || '').split('\n');
    return lines.some((line) => line.split(':')[0].trim() === suffix);
  } catch (err) {
    logger.warn({ err: err.message }, '[PasswordPolicy] HIBP lookup failed; failing open');
    return false;
  }
}

module.exports = { isPasswordBreached };
