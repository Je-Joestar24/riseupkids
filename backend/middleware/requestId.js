const crypto = require('crypto');

/**
 * Attach a short request id to every request (RUK-SEC-011).
 *
 * In production a 5xx response body is generic — it carries only this id, which is also returned
 * in the `X-Request-Id` header and written to the server log, so support can trace one specific
 * failure without the response leaking internal detail.
 *
 * An inbound `X-Request-Id` is trusted only if it looks sane (so a caller can correlate its own
 * logs); otherwise we generate one.
 */
const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

module.exports = function requestId(req, res, next) {
  const incoming = req.get('X-Request-Id');
  req.id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
};
