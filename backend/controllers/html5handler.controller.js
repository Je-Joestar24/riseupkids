/**
 * HTML5 Handler Controller
 *
 * Upload HTML5 zip and host; optional launch URL helper.
 * No SCORM, no Book/Course logic.
 */

const html5handlerService = require('../services/html5handler.service');
const axios = require('axios');
const s3Service = require('../services/s3.service');
const cloudfrontService = require('../services/cloudfront.service');

/**
 * POST /api/html5handler/upload
 * Multipart: one file (HTML5 zip). Returns { id, launchUrl, entryPoint }.
 */
const upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an HTML5 zip file (field: file)',
      });
    }

    const buffer = req.file.buffer;

    if (!buffer) {
      return res.status(400).json({
        success: false,
        message: 'Could not read uploaded file',
      });
    }

    const { id, entryPoint, baseUrl } = await html5handlerService.extractAndUploadToS3Only(buffer);

    const backendOrigin = `${req.protocol}://${req.get('host')}`;
    const launchUrl = baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/${(entryPoint || 'index.html').replace(/^\//, '')}`
      : (await html5handlerService.getLaunchUrl(id, backendOrigin, entryPoint)).launchUrl;

    res.status(201).json({
      success: true,
      message: 'HTML5 package uploaded and ready to host',
      data: { id, launchUrl, entryPoint: entryPoint || 'index.html' },
    });
  } catch (error) {
    console.error('[html5handler] upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload HTML5 package',
    });
  }
};

/**
 * GET /api/html5handler/:id/launch
 * Returns { launchUrl, entryPoint } for the package.
 */
const getLaunchUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const result = await html5handlerService.getLaunchUrl(id, baseUrl);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const status = error.message === 'HTML5 package not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to get launch URL',
    });
  }
};

/**
 * GET /api/html5handler/:id/bridge-status
 * Debug helper: fetch entry HTML and check if score bridge is injected.
 * This helps validate CloudFront/S3 packages without opening the browser devtools.
 */
const getBridgeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { launchUrl, entryPoint } = await html5handlerService.getLaunchUrl(id, baseUrl);

    // Add cache-buster to avoid CloudFront/browser cached HTML during debugging.
    const cacheBust = `t=${Date.now()}`;
    const urlWithBust = launchUrl.includes('?') ? `${launchUrl}&${cacheBust}` : `${launchUrl}?${cacheBust}`;

    const response = await axios.get(urlWithBust, {
      responseType: 'text',
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      validateStatus: () => true,
    });

    const html = typeof response.data === 'string' ? response.data : '';
    const hasBridgeCloudFront = html.includes('ruk-html5-bridge.js');

    // Best-effort: check the actual S3 object too (bypasses CloudFront caching).
    let s3 = null;
    if (s3Service.isConfigured()) {
      try {
        const entryKey = s3Service.getS3KeyFromUrl(launchUrl);
        if (entryKey) {
          const s3HtmlBuf = await s3Service.getObjectBuffer(entryKey);
          const s3Html = s3HtmlBuf.toString('utf8');
          const hasBridgeS3 = s3Html.includes('ruk-html5-bridge.js');
          const idx = s3Html.indexOf('ruk-html5-bridge.js');
          s3 = {
            entryKey,
            hasBridgeS3,
            htmlBytes: s3HtmlBuf.length,
            snippet: idx >= 0 ? s3Html.slice(Math.max(0, idx - 80), idx + 80) : null,
          };
        }
      } catch (e) {
        s3 = { error: e?.message || String(e) };
      }
    }

    const idx = html.indexOf('ruk-html5-bridge.js');
    const cloudfrontSnippet = idx >= 0 ? html.slice(Math.max(0, idx - 80), idx + 80) : null;

    return res.status(200).json({
      success: true,
      data: {
        id,
        entryPoint,
        launchUrl,
        cloudfront: {
          urlFetched: urlWithBust,
          httpStatus: response.status,
          hasBridge: hasBridgeCloudFront,
          htmlBytes: Buffer.byteLength(html, 'utf8'),
          snippet: cloudfrontSnippet,
          headers: {
            'cache-control': response.headers?.['cache-control'],
            age: response.headers?.age,
            via: response.headers?.via,
            'x-cache': response.headers?.['x-cache'],
            etag: response.headers?.etag,
            'last-modified': response.headers?.['last-modified'],
          },
        },
        s3,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check bridge status',
    });
  }
};

/**
 * POST /api/html5handler/:id/reinject-bridge
 * Admin-only: overwrites entry HTML + uploads bridge JS in S3 for legacy packages.
 */
const reinjectBridge = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await html5handlerService.reinjectBridgeToS3(id, baseUrl);

    let invalidation = null;
    if (result?.updated && cloudfrontService.isConfigured()) {
      invalidation = await cloudfrontService.invalidate([`/html5/${id}/*`]);
    }

    return res.status(200).json({ success: true, data: { ...result, invalidation } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to reinject bridge' });
  }
};

module.exports = {
  upload,
  getLaunchUrl,
  getBridgeStatus,
  reinjectBridge,
};
