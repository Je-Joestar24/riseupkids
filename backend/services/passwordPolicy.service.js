/**
 * Password policy (Chunk 10): minimum length + a real breached-password check, instead of
 * composition-rule theater ("must contain a symbol"). Applied on register, change, and reset.
 */
const { isPasswordBreached } = require('./hibp.service');

const MIN_LENGTH = 12;

function validatePasswordLength(password) {
  if (!password || typeof password !== 'string' || password.length < MIN_LENGTH) {
    throw new Error(`Password must be at least ${MIN_LENGTH} characters.`);
  }
}

/**
 * Throws if the password fails the length check or has appeared in a known data breach.
 * @param {string} password
 */
async function assertPasswordPolicy(password) {
  validatePasswordLength(password);
  const breached = await isPasswordBreached(password);
  if (breached) {
    throw new Error(
      'This password has appeared in a known data breach. Please choose a different password.'
    );
  }
}

module.exports = { assertPasswordPolicy, validatePasswordLength, MIN_LENGTH };
