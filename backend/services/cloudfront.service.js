const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

/**
 * CloudFront Service
 * Optional helper to invalidate cached HTML5 package files after reinjection/overwrite.
 *
 * Env:
 * - CLOUDFRONT_DISTRIBUTION_ID
 * - AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

const getConfig = () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID || '',
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

let _client = null;
const getClient = () => {
  if (_client) return _client;
  const c = getConfig();
  if (!c.distributionId || !c.credentials) {
    throw new Error('CloudFront not configured: CLOUDFRONT_DISTRIBUTION_ID and AWS credentials required');
  }
  _client = new CloudFrontClient({ region: c.region, credentials: c.credentials });
  return _client;
};

const isConfigured = () => {
  const c = getConfig();
  return !!(c.distributionId && c.credentials);
};

/**
 * Create a CloudFront invalidation for a set of paths.
 * @param {string[]} paths - e.g. ['/html5/abc123/*']
 */
async function invalidate(paths) {
  const c = getConfig();
  const client = getClient();
  const distributionId = c.distributionId;

  const unique = Array.from(new Set((paths || []).filter(Boolean)));
  if (!unique.length) {
    return { ok: true, invalidationId: null, paths: [] };
  }

  const command = new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `ruk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      Paths: {
        Quantity: unique.length,
        Items: unique,
      },
    },
  });

  const res = await client.send(command);
  return {
    ok: true,
    invalidationId: res?.Invalidation?.Id || null,
    status: res?.Invalidation?.Status || null,
    paths: unique,
  };
}

module.exports = {
  getConfig,
  isConfigured,
  invalidate,
};

