/**
 * Security response headers for the API (RUK-SEC-009).
 *
 * This is a JSON API, not an HTML app, so the header set is deliberately narrow:
 *  - Content-Security-Policy is OFF — CSP protects HTML pages, and the HTML pages (admin + sales
 *    sites) are static files on CloudFront; their headers are set there, not here.
 *  - Cross-Origin-Resource-Policy is 'cross-origin' — the API is called from https://app.riseup.kids
 *    and the mobile app, which are different origins.
 *  - Frame protection is OFF — a JSON API can't be clickjacked, and the legacy interactive-content
 *    player still serves HTML in an iframe from this origin. The clickjacking target that matters
 *    (the admin SPA) is on CloudFront and gets its frame policy there.
 *  - HSTS max-age comes from HSTS_MAX_AGE (default 86400 = 1 day). Set HSTS_MAX_AGE=0 to turn it
 *    off immediately with no deploy. Once you've confirmed nothing calls the API over plain http://,
 *    raise it to ~15552000 (180 days).
 *
 * Helmet also gives us, with its defaults: X-Content-Type-Options: nosniff, Referrer-Policy:
 * no-referrer, X-DNS-Prefetch-Control: off, X-Download-Options: noopen,
 * X-Permitted-Cross-Domain-Policies: none, Origin-Agent-Cluster, and removal of X-Powered-By.
 */
const helmet = require('helmet');

function envInt(name, fallback) {
  const n = parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** @returns {import('express').RequestHandler} */
function buildHelmet() {
  const hstsMaxAge = envInt('HSTS_MAX_AGE', 86400);
  return helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: false,
    hsts: hstsMaxAge > 0 ? { maxAge: hstsMaxAge, includeSubDomains: false, preload: false } : false,
  });
}

module.exports = { buildHelmet, envInt };
