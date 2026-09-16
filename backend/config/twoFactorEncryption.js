/**
 * Encryption at rest for TOTP secrets (Chunk 10).
 *
 * A TOTP secret is not a password — it can't be one-way hashed, since the server has to use it
 * to independently compute the same 6-digit code the user's authenticator app shows. Anyone who
 * reads it from the database can generate valid codes forever, so it's encrypted (AES-256-GCM)
 * rather than stored in plaintext, unlike a normal `select:false` field.
 *
 * TWO_FACTOR_ENCRYPTION_KEY must be a 32-byte key, hex-encoded (64 hex chars) — generate with
 * `openssl rand -hex 32`. Deliberately a separate key from JWT_SECRET: reusing a signing secret
 * for encryption is a well-known anti-pattern (different algorithms, different rotation needs).
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard nonce size

function getKey() {
  const hex = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'TWO_FACTOR_ENCRYPTION_KEY is not configured (must be a 64-char hex string — openssl rand -hex 32)'
    );
  }
  return Buffer.from(hex, 'hex');
}

/** @param {string} plaintext @returns {string} `iv:authTag:ciphertext`, all hex */
function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/** @param {string} payload - `iv:authTag:ciphertext` as produced by encrypt() @returns {string} */
function decrypt(payload) {
  const key = getKey();
  const parts = String(payload || '').split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted payload');
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/** True when TWO_FACTOR_ENCRYPTION_KEY is present and well-formed — checked at startup and
 * before any 2FA enrollment, so a misconfiguration fails loudly instead of at first real use. */
function isConfigured() {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

module.exports = { encrypt, decrypt, isConfigured };
