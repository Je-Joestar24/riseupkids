/**
 * HTML5 Handler Controller
 *
 * Upload HTML5 zip and host; optional launch URL helper.
 * No SCORM, no Book/Course logic.
 */

const html5handlerService = require('../services/html5handler.service');

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

    const { id, entryPoint } = await html5handlerService.extractAndStore(buffer);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { launchUrl } = await html5handlerService.getLaunchUrl(id, baseUrl, entryPoint);

    res.status(201).json({
      success: true,
      message: 'HTML5 package uploaded and ready to host',
      data: { id, launchUrl, entryPoint },
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

module.exports = {
  upload,
  getLaunchUrl,
};
