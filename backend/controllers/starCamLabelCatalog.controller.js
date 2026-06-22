const starCamVisionLabelService = require('../services/starCamVisionLabel.service');

function resolveStatusCode(error, fallback = 500) {
  if (error && Number.isInteger(error.statusCode)) return error.statusCode;
  return fallback;
}

const searchLabelCatalog = async (req, res) => {
  try {
    const { q, limit, childFriendlyOnly } = req.query || {};
    const data = await starCamVisionLabelService.searchLabels({
      query: q,
      limit,
      childFriendlyOnly: String(childFriendlyOnly || '').toLowerCase() === 'true',
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message || 'Failed to search label catalog',
    });
  }
};

const listRecentCustomLabels = async (req, res) => {
  try {
    const { limit } = req.query || {};
    const data = await starCamVisionLabelService.listRecentCustomLabels({ limit });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message || 'Failed to list recent custom labels',
    });
  }
};

const createCustomLabel = async (req, res) => {
  try {
    const { displayName, defaultTerms } = req.body || {};
    const data = await starCamVisionLabelService.createCustomLabel({
      displayName,
      defaultTerms,
      createdBy: req.user?._id,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const statusCode = resolveStatusCode(error, 400);
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create custom label',
      ...(error.existingLabelId ? { existingLabelId: error.existingLabelId } : {}),
    });
  }
};

module.exports = {
  searchLabelCatalog,
  listRecentCustomLabels,
  createCustomLabel,
};
