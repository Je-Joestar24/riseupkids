/**
 * TOTP two-factor authentication (Chunk 10): enrollment (QR code), verification, and single-use
 * recovery codes. Required for admin accounts, optional for parents/teachers.
 */
const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const TwoFactorSecret = require('../models/TwoFactorSecret');
const RecoveryCode = require('../models/RecoveryCode');
const { encrypt, decrypt, isConfigured } = require('../config/twoFactorEncryption');
const logger = require('../config/logger');

const ISSUER = 'Rise Up Kids';
const RECOVERY_CODE_COUNT = 10;

/** 6-digit TOTP code from user input, digits only. */
function normalizeCode(code) {
  return (code || '').toString().trim().replace(/\D/g, '').slice(0, 6);
}

/** Recovery codes are shown to the user as "XXXXX-XXXXX" but stored/compared without the dash. */
function normalizeRecoveryCode(code) {
  return (code || '').toString().trim().toUpperCase().replace(/[^0-9A-F]/g, '');
}

/**
 * Distinguish a live 6-digit TOTP code from a recovery code, from the RAW input shape (whitespace
 * and dashes stripped only) — never from the post-normalizeCode() digit count. A recovery code is
 * 10 hex characters, and hex digits are ~62% numeric by chance, so "how many digits are left after
 * stripping every non-digit character" is not a reliable signal: a real recovery code frequently
 * strips down to exactly 6 digits by pure coincidence and gets misrouted to TOTP verification,
 * where it always fails. Every caller that needs to route between the two MUST use this, not
 * `normalizeCode(code).length === 6`.
 * @param {string} code
 * @returns {'totp' | 'recovery' | 'unknown'}
 */
function classifyCode(code) {
  const cleaned = (code || '').toString().trim().replace(/[\s-]/g, '');
  if (/^\d{6}$/.test(cleaned)) return 'totp';
  if (/^[0-9A-Fa-f]{10}$/.test(cleaned)) return 'recovery';
  return 'unknown';
}

function generateRecoveryCodePlain() {
  return crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars
}

function formatRecoveryCodeForDisplay(plain) {
  return `${plain.slice(0, 5)}-${plain.slice(5)}`;
}

function hashRecoveryCode(normalizedPlain) {
  return crypto.createHash('sha256').update(normalizedPlain).digest('hex');
}

/**
 * Start (or restart) enrollment: generates a fresh secret, stores it encrypted and NOT yet
 * enabled, and returns everything needed to render a QR code. A second call before the first is
 * confirmed simply overwrites the pending secret — no stale rows from an abandoned attempt.
 * @param {string} userId
 * @param {string} email - shown as the account label in the authenticator app
 * @returns {Promise<{ secret: string, otpauthUrl: string, qrDataUrl: string }>}
 */
async function startEnrollment(userId, email) {
  if (!isConfigured()) {
    throw new Error('Two-factor authentication is not available right now. Please try again later.');
  }

  const secret = authenticator.generateSecret();
  await TwoFactorSecret.findOneAndUpdate(
    { userId },
    { userId, secret: encrypt(secret), enabled: false, enabledAt: null },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const otpauthUrl = authenticator.keyuri(email, ISSUER, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, otpauthUrl, qrDataUrl };
}

/**
 * Complete enrollment: verify a code against the pending secret, enable it, and issue a fresh
 * batch of recovery codes (returned once, in plaintext — never retrievable again afterward).
 * @param {string} userId
 * @param {string} code
 * @returns {Promise<{ recoveryCodes: string[] }>}
 */
async function confirmEnrollment(userId, code) {
  const doc = await TwoFactorSecret.findOne({ userId }).select('+secret');
  if (!doc) {
    throw new Error('No two-factor setup in progress. Please start setup again.');
  }
  if (doc.enabled) {
    throw new Error('Two-factor authentication is already enabled.');
  }

  const secret = decrypt(doc.secret);
  if (!authenticator.verify({ token: normalizeCode(code), secret })) {
    throw new Error('Invalid verification code.');
  }

  doc.enabled = true;
  doc.enabledAt = new Date();
  await doc.save();

  const recoveryCodes = await regenerateRecoveryCodes(userId);
  logger.info({ userId: String(userId) }, '[2FA] TOTP enabled');
  return { recoveryCodes };
}

/**
 * Replace the recovery-code batch — the old batch is deleted first, so codes already shown to
 * the user become worthless immediately. Returns the new codes in plaintext, once.
 * @param {string} userId
 * @returns {Promise<string[]>} formatted as "XXXXX-XXXXX"
 */
async function regenerateRecoveryCodes(userId) {
  await RecoveryCode.deleteMany({ userId });
  const docs = [];
  const display = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i += 1) {
    const plain = generateRecoveryCodePlain();
    docs.push({ userId, codeHash: hashRecoveryCode(plain) });
    display.push(formatRecoveryCodeForDisplay(plain));
  }
  await RecoveryCode.insertMany(docs);
  return display;
}

/** @returns {Promise<boolean>} whether this user currently has TOTP enabled. */
async function isEnabled(userId) {
  const doc = await TwoFactorSecret.findOne({ userId, enabled: true }).select('_id').lean();
  return Boolean(doc);
}

/** Verify a live TOTP code against the user's enabled secret. False if 2FA isn't enabled. */
async function verifyTotp(userId, code) {
  const doc = await TwoFactorSecret.findOne({ userId, enabled: true }).select('+secret');
  if (!doc) return false;
  const secret = decrypt(doc.secret);
  return authenticator.verify({ token: normalizeCode(code), secret });
}

/** Verify + consume a recovery code. Single-use: returns false on a second attempt with the
 * same code, even if it was valid the first time. */
async function verifyRecoveryCode(userId, code) {
  const normalized = normalizeRecoveryCode(code);
  if (normalized.length !== 10) return false;

  const doc = await RecoveryCode.findOne({ userId, codeHash: hashRecoveryCode(normalized), usedAt: null });
  if (!doc) return false;

  doc.usedAt = new Date();
  await doc.save();
  logger.warn({ userId: String(userId) }, '[2FA] Recovery code used — one fewer remaining');
  return true;
}

/** Fully remove TOTP + all recovery codes for a user (disable 2FA). */
async function disable(userId) {
  await TwoFactorSecret.deleteOne({ userId });
  await RecoveryCode.deleteMany({ userId });
  logger.info({ userId: String(userId) }, '[2FA] TOTP disabled');
}

/** Count of unused recovery codes remaining — shown in settings so a user knows when to
 * regenerate before running out. */
async function countRemainingRecoveryCodes(userId) {
  return RecoveryCode.countDocuments({ userId, usedAt: null });
}

module.exports = {
  startEnrollment,
  confirmEnrollment,
  regenerateRecoveryCodes,
  isEnabled,
  verifyTotp,
  verifyRecoveryCode,
  disable,
  countRemainingRecoveryCodes,
  classifyCode,
  // exported for tests
  normalizeCode,
  normalizeRecoveryCode,
  hashRecoveryCode,
};
