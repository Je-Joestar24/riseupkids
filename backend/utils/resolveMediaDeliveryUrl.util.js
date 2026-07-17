/**
 * Resolve a Media document URL to an absolute delivery URL for clients (manifest preload, etc.).
 * Prefers cloud/CDN URLs; relative `/uploads/...` paths are joined to AWS_S3_BASE_URL or BACKEND_BASE_URL.
 */

function asTrimmed(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str || null;
}

function deliveryBaseUrl() {
  return (
    process.env.AWS_S3_BASE_URL ||
    process.env.BACKEND_BASE_URL ||
    process.env.API_PUBLIC_BASE_URL ||
    'http://localhost:5000'
  ).replace(/\/+$/, '');
}

function resolveMediaDeliveryUrl(raw) {
  const trimmed = asTrimmed(raw);
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;

  const base = deliveryBaseUrl();
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

/** Prefer cloudUrl (CDN) over stored url when building manifest entries. */
function resolveMediaDocumentUrl(mediaView) {
  if (!mediaView) return null;
  return resolveMediaDeliveryUrl(mediaView.cloudUrl || mediaView.url);
}

module.exports = {
  deliveryBaseUrl,
  resolveMediaDeliveryUrl,
  resolveMediaDocumentUrl,
};
