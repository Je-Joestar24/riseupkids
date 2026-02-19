const express = require('express');
const s3Service = require('../services/s3.service');

const router = express.Router();

/**
 * GET /api/cloudfront/health
 * Verifies that S3/CloudFront is configured and reachable.
 */
router.get('/health', async (req, res) => {
  try {
    const config = s3Service.getConfig();
    const configured = s3Service.isConfigured();

    if (!configured) {
      return res.status(503).json({
        ok: false,
        message: 'S3/CloudFront not configured',
        details: {
          hasBucket: !!config.bucket,
          hasBaseUrl: !!config.baseUrl,
          hasCredentials: !!(config.credentials && config.credentials.accessKeyId),
        },
      });
    }

    const connection = await s3Service.checkConnection();

    if (!connection.ok) {
      return res.status(503).json({
        ok: false,
        message: 'S3 connection check failed',
        s3: 'disconnected',
        cloudfront: 'configured',
        error: connection.error,
        code: connection.code,
        hint: connection.code === 'UnknownError' || connection.code === 'NetworkingError'
          ? 'Check AWS_REGION matches your bucket region, and that the bucket exists. If on EC2, ensure IAM role or env credentials have s3:ListBucket on this bucket.'
          : undefined,
      });
    }

    res.json({
      ok: true,
      message: 'S3 and CloudFront are connected',
      s3: 'connected',
      cloudfront: 'configured',
      bucket: config.bucket,
      baseUrl: config.baseUrl,
      region: config.region,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      message: err.message || 'Health check failed',
      error: err.message,
    });
  }
});

module.exports = router;
