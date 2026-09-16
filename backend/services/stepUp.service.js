/**
 * Step-up authentication (Chunk 10): sensitive admin actions (role changes, bulk exports,
 * deletion overrides) require a code entered within the last few minutes, even in an already
 * logged-in session — a stolen/idle session alone isn't enough for the highest-risk actions.
 *
 * Flow: the frontend calls POST /api/auth/step-up-verify with a fresh TOTP/recovery code, gets
 * back a short-lived step-up token, and sends it as `X-Step-Up-Token` on the one sensitive
 * request it's for. requireStepUp() (middleware/stepUp.js) checks that header.
 *
 * Reuses JWT_SECRET — this is still just a short-lived signed assertion ("this user re-verified
 * recently"), not a separately-keyed secret like the TOTP encryption key.
 */
const jwt = require('jsonwebtoken');

const STEP_UP_TTL = process.env.STEP_UP_TOKEN_EXPIRE || '5m';

/**
 * @param {string} userId
 * @returns {string} a short-lived JWT asserting this user completed step-up verification
 */
function issueStepUpToken(userId) {
  return jwt.sign({ id: String(userId), stepUp: true }, process.env.JWT_SECRET, {
    expiresIn: STEP_UP_TTL,
  });
}

/**
 * @param {string} token
 * @param {string} userId - must match the token's subject; a step-up token is not transferable
 * @returns {boolean}
 */
function verifyStepUpToken(token, userId) {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.stepUp === true && decoded.id === String(userId);
  } catch {
    return false;
  }
}

module.exports = { issueStepUpToken, verifyStepUpToken };
