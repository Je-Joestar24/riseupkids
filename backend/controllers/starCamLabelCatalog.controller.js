const starCamVisionLabelService = require('../services/starCamVisionLabel.service');

function resolveStatusCode(error, fallback = 500) {
  if (error && Number.isInteger(error.statusCode)) return error.statusCode;
  return fallback;
}

const searchLabelCatalog = async (req, res) => {
  try {
    const { q, limit, childFriendlyOnly, availableOnly } = req.query || {};
    const data = await starCamVisionLabelService.searchLabels({
      query: q,
      limit,
      childFriendlyOnly: String(childFriendlyOnly || '').toLowerCase() === 'true',
      availableOnly: String(availableOnly || 'true').toLowerCase() !== 'false',
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
    const { limit, availableOnly } = req.query || {};
    const data = await starCamVisionLabelService.listRecentCustomLabels({
      limit,
      availableOnly: String(availableOnly || 'true').toLowerCase() !== 'false',
    });
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

const listManagedLabels = async (req, res) => {
  try {
    const { page, limit, search, availableOnly } = req.query || {};
    let parsedAvailableOnly;
    if (String(availableOnly || '').toLowerCase() === 'true') parsedAvailableOnly = true;
    if (String(availableOnly || '').toLowerCase() === 'false') parsedAvailableOnly = false;

    const data = await starCamVisionLabelService.listLabelsForAdmin({
      page,
      limit,
      search,
      availableOnly: parsedAvailableOnly,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message || 'Failed to list labels',
    });
  }
};

const updateLabelAvailability = async (req, res) => {
  try {
    const { labelId } = req.params || {};
    const { isAvailableForMissions } = req.body || {};
    const data = await starCamVisionLabelService.setLabelAvailability({
      labelId,
      isAvailableForMissions,
      updatedBy: req.user?._id,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || 'Failed to update label availability',
    });
  }
};

const bulkUpdateLabelAvailability = async (req, res) => {
  try {
    const { labelIds, isAvailableForMissions, selectAllMatching, search } = req.body || {};
    const data = await starCamVisionLabelService.bulkSetLabelAvailability({
      labelIds,
      isAvailableForMissions,
      selectAllMatching: Boolean(selectAllMatching),
      search,
      updatedBy: req.user?._id,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || 'Failed to bulk update label availability',
    });
  }
};

module.exports = {
  searchLabelCatalog,
  listRecentCustomLabels,
  createCustomLabel,
  listManagedLabels,
  updateLabelAvailability,
  bulkUpdateLabelAvailability,
};
