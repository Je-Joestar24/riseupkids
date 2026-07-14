const accountDeletionService = require('../services/accountDeletion.service');

/**
 * @desc    List account/child deletion requests
 * @route   GET /api/admin/deletion-requests
 */
const listDeletionRequests = async (req, res) => {
  try {
    const { status, limit } = req.query;
    const requests = await accountDeletionService.listDeletionRequests({
      status,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    res.status(200).json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to list deletion requests',
    });
  }
};

/**
 * @desc    Execute a single deletion request (Mongo + S3 purge)
 * @route   POST /api/admin/deletion-requests/:id/execute
 */
const executeDeletionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await accountDeletionService.executeDeletionRequest(id);

    res.status(200).json({
      success: true,
      message: result.alreadyCompleted
        ? 'Deletion request was already completed'
        : 'Deletion request completed successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to execute deletion request',
    });
  }
};

/**
 * @desc    Execute all pending deletion requests
 * @route   POST /api/admin/deletion-requests/execute-pending
 */
const executeAllPendingDeletionRequests = async (req, res) => {
  try {
    const dueOnly = req.query.force !== 'true';
    const results = await accountDeletionService.executeAllPendingRequests({ dueOnly });

    res.status(200).json({
      success: true,
      message: dueOnly
        ? `Processed ${results.length} due deletion request(s)`
        : `Processed ${results.length} pending deletion request(s) (forced)`,
      data: results,
      dueOnly,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process pending deletion requests',
    });
  }
};

module.exports = {
  listDeletionRequests,
  executeDeletionRequest,
  executeAllPendingDeletionRequests,
};
