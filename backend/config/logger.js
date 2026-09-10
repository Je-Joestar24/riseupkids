/**
 * Structured application logger with central redaction (RUK-SEC-010 / Chunk 6).
 *
 * Every log line goes through `pino` and a recursive scrubber that masks sensitive keys at ANY
 * depth — passwords, tokens, JWTs, OTP/reset codes, card data, provider secrets, the Mongo URI,
 * and child PII (name / DOB / photo URLs). So a controller can `logger.info({ user }, 'saved')`
 * without having to remember which fields on `user` are sensitive.
 *
 * Usage:
 *   const logger = require('../config/logger');
 *   logger.info('server started');
 *   logger.info({ userId, plan }, 'subscription activated');
 *   logger.error({ err }, 'checkout failed');           // Error objects -> use the `err` key
 *   logger.child({ requestId }) ...                     // request-scoped, done by pino-http
 *
 * `logger.log/warn/error/info/debug` also accept console-style varargs
 * (`logger.error('checkout failed:', err)`) so the codebase sweep stays mechanical — object
 * arguments are merged and scrubbed, a trailing/leading string becomes the message.
 *
 * Message-string interpolation is NOT scrubbed (`logger.info(\`token \${t}\`)` leaks) — the sweep
 * fixes those, and tests/logging.noSecrets.test.js guards against regressions.
 */
const pino = require('pino');

const isProdLike = ['production', 'staging'].includes((process.env.NODE_ENV || '').toLowerCase());
const isTest = (process.env.NODE_ENV || '').toLowerCase() === 'test';

/** Keys whose value is masked wherever they appear (case-insensitive, substring match). */
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwd',
  'secret',
  'token', // access/refresh/id/authenticity/csrf/expo/webhook…
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'client_secret',
  'clientsecret',
  'privatekey',
  'private_key',
  'otp',
  'resetcode',
  'reset_code',
  'verificationcode',
  'mongodb_uri',
  'mongodburi',
  'connectionstring',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'cpf', // Brazilian tax id
  'taxid',
  'ssn',
];

/** Exact keys (lower-cased) that are child / user PII — masked to keep PII out of logs. */
const PII_KEYS = new Set([
  'childname',
  'child_name',
  'displayname',
  'display_name',
  'dob',
  'dateofbirth',
  'date_of_birth',
  'birthdate',
  'firstname',
  'lastname',
  'first_name',
  'last_name',
  'fullname',
  'full_name',
  'phone',
  'phonenumber',
  'phone_number',
  'address',
  'photourl',
  'photo_url',
  'avatarurl',
  'avatar_url',
]);

const MASK = '[Redacted]';
const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b/g;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._-]{10,}/gi;
// Connection strings with inline credentials (Mongo, Postgres, Redis, amqp, …).
const DB_URI_CRED_RE = /\b([a-z][a-z0-9+.-]*:\/\/)[^\s:/@]+:[^\s:/@]+@/gi;
// Stripe/live-style API secret keys.
const API_KEY_RE = /\b(sk|rk|whsec|pk)_(live|test)_[A-Za-z0-9]{8,}/g;

/** Error -> plain object: keep type + a scrubbed message; stack only outside production. */
function serializeError(e) {
  if (!e || typeof e !== 'object') return e;
  const out = {
    type: e.name || e.type || 'Error',
    message: scrubString(String(e.message || e.msg || e)),
  };
  if (e.statusCode) out.statusCode = e.statusCode;
  if (e.code && typeof e.code === 'string') out.code = e.code;
  // Stack only outside production, and scrubbed — its first line repeats the (raw) message.
  if (!isProdLike && e.stack) out.stack = scrubString(e.stack);
  return out;
}

function isSensitiveKey(key) {
  const k = String(key).toLowerCase();
  if (PII_KEYS.has(k)) return true;
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p));
}

/** Mask secrets that appear inside a free-text string (JWTs, bearer tokens, emails). */
function scrubString(s) {
  if (typeof s !== 'string' || s.length < 6) return s;
  return s
    .replace(JWT_RE, MASK)
    .replace(BEARER_RE, 'Bearer ' + MASK)
    .replace(DB_URI_CRED_RE, (_m, scheme) => `${scheme}${MASK}@`)
    .replace(API_KEY_RE, MASK)
    .replace(EMAIL_RE, (_m, first, domain) => `${first}***${domain}`);
}

/** Recursively copy `value`, masking sensitive keys and scrubbing strings. Depth- and cycle-safe. */
function scrub(value, seen = new WeakSet(), depth = 0) {
  if (depth > 8) return '[Truncated]';
  if (value == null) return value;
  if (typeof value === 'string') return scrubString(value);
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, seen, depth + 1));

  if (value instanceof Error) return serializeError(value);

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = isSensitiveKey(k) ? MASK : scrub(v, seen, depth + 1);
  }
  return out;
}

const pinoOptions = {
  level: process.env.LOG_LEVEL || (isProdLike ? 'info' : isTest ? 'silent' : 'debug'),
  base: { pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    // Fast-path for the well-known HTTP request/response shapes; `scrub` is the catch-all.
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-authenticity-token"]',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      'token',
      '*.token',
    ],
    censor: MASK,
  },
  formatters: {
    level: (label) => ({ level: label }),
    // Runs on the merged bindings object — the central scrub point for structured fields.
    log: (obj) => scrub(obj),
  },
  serializers: {
    err: serializeError,
    error: serializeError,
  },
  hooks: {
    // Scrub the message string too (JWTs / bearer tokens / emails interpolated into a
    // template literal aren't structured fields, so `formatters.log` never sees them).
    logMethod(inputArgs, method) {
      const cleaned = inputArgs.map((a) => (typeof a === 'string' ? scrubString(a) : a));
      return method.apply(this, cleaned);
    },
  },
};

let baseLogger;
if (!isProdLike && !isTest) {
  // Dev: human-readable. pino-pretty is a devDependency.
  try {
    baseLogger = pino({
      ...pinoOptions,
      transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
    });
  } catch {
    baseLogger = pino(pinoOptions);
  }
} else {
  baseLogger = pino(pinoOptions);
}

// Capture the real pino methods BEFORE overriding, so the compat wrappers don't call themselves.
const orig = {
  info: baseLogger.info.bind(baseLogger),
  warn: baseLogger.warn.bind(baseLogger),
  error: baseLogger.error.bind(baseLogger),
  debug: baseLogger.debug.bind(baseLogger),
};

/**
 * console-style varargs wrapper: `logger.error('checkout failed:', err, { orderId })`.
 * Objects are merged (Errors under `err`); non-objects are joined into the message. The native
 * pino 2-arg form `logger.info({ ... }, 'msg')` also works and is preferred in new code.
 */
function compat(level) {
  return (...args) => {
    if (args.length === 0) return;
    if (args.length === 1 && typeof args[0] === 'string') return orig[level](args[0]);
    // Native pino form: (mergingObject, message[, ...interp])
    if (args.length >= 2 && args[0] && typeof args[0] === 'object' && !(args[0] instanceof Error) &&
        typeof args[1] === 'string' && args.every((a, i) => i === 0 || typeof a !== 'object')) {
      return orig[level](args[0], args[1], ...args.slice(2));
    }
    const merge = {};
    const parts = [];
    let errCount = 0;
    for (const a of args) {
      if (a instanceof Error) {
        merge[errCount === 0 ? 'err' : `err${errCount}`] = a;
        errCount += 1;
      } else if (a && typeof a === 'object' && !Array.isArray(a)) {
        Object.assign(merge, a);
      } else if (Array.isArray(a)) {
        merge.items = a;
      } else {
        parts.push(String(a));
      }
    }
    const msg = parts.join(' ');
    return Object.keys(merge).length ? orig[level](merge, msg) : orig[level](msg);
  };
}

// Attach console-compatible aliases; pino's own methods (`child`, `level`, `flush`, …) stay intact.
baseLogger.log = compat('info');
baseLogger.info = compat('info');
baseLogger.warn = compat('warn');
baseLogger.error = compat('error');
baseLogger.debug = compat('debug');

module.exports = baseLogger;
module.exports.scrub = scrub;
module.exports.isSensitiveKey = isSensitiveKey;
module.exports.scrubString = scrubString;
