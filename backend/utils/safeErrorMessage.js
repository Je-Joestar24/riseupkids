/**
 * Client-safe error message for controllers that catch a third-party API error locally instead
 * of calling `next(error)` (RUK-SEC-011 follow-up). Those catch blocks historically returned
 * `error.message` straight to the browser — for axios errors built by `describeAxiosError()`
 * helpers in paypalService.js / pagseguro.service.js, that includes the HTTP status, any
 * provider debug id, and the full raw response body from Stripe/PayPal/PagBank.
 *
 * In production/staging, always return the generic fallback; log the real error server-side
 * separately. In development, keep returning the real message — it's useful while building
 * against a sandbox.
 */
const isProdLike = () => ['production', 'staging'].includes((process.env.NODE_ENV || '').toLowerCase());

/**
 * @param {Error|{message?: string}} err
 * @param {string} fallback - Generic, user-safe message.
 * @returns {string}
 */
function safeErrorMessage(err, fallback) {
  if (isProdLike()) return fallback;
  return (err && err.message) || fallback;
}

module.exports = { safeErrorMessage, isProdLike };
