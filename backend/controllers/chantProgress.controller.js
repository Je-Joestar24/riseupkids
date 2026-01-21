const chantProgressService = require('../services/chantProgress.services');
const { ChildProfile } = require('../models');

const verifyChildAccessForParent = async (req, childId) => {
  if (req.user.role !== 'parent') return;

  const child = await ChildProfile.findOne({
    _id: childId,
    parent: req.user._id,
  }).select('_id');

  if (!child) {
    const err = new Error('Child not found or does not belong to you');
    err.statusCode = 403;
    throw err;
  }
};

/**
 * @desc    Start a chant for a child (create progress if missing)
 * @route   POST /api/chants/:id/child/:childId/start
 * @access  Private (Parent/Admin)
 */
const startChantForChild = async (req, res) => {
  try {
    const { id: chantId, childId } = req.params;

    await verifyChildAccessForParent(req, childId);

    const progress = await chantProgressService.startChant({ childId, chantId });

    res.status(200).json({
      success: true,
      message: 'Chant started',
      data: progress,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.message.includes('not found') ? 404 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to start chant',
    });
  }
};

/**
 * @desc    Get chant progress for a child
 * @route   GET /api/chants/:id/child/:childId/progress
 * @access  Private (Parent/Admin/Teacher)
 */
const getChantProgressForChild = async (req, res) => {
  try {
    const { id: chantId, childId } = req.params;

    await verifyChildAccessForParent(req, childId);

    const progress = await chantProgressService.getChantProgress({ childId, chantId });

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.message.includes('not found') ? 404 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get chant progress',
    });
  }
};

/**
 * @desc    Complete chant with child's recorded audio (no admin/teacher review)
 * @route   POST /api/chants/:id/child/:childId/complete
 * @access  Private (Parent/Admin)
 *
 * Request (multipart/form-data):
 * - recordedAudio: File (required)
 * - timeSpent: Number (optional) - seconds
 * - metadata: JSON String (optional)
 */
const completeChantForChild = async (req, res) => {
  try {
    const { id: chantId, childId } = req.params;

    await verifyChildAccessForParent(req, childId);

    let parsedMetadata = undefined;
    if (req.body?.metadata) {
      try {
        parsedMetadata = typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata;
      } catch (e) {
        parsedMetadata = undefined;
      }
    }

    const progress = await chantProgressService.completeChant({
      childId,
      chantId,
      uploadedByUserId: req.user._id,
      recordedAudioFile: req.file,
      timeSpent: req.body?.timeSpent,
      metadata: parsedMetadata,
    });

    res.status(200).json({
      success: true,
      message: 'Chant completed successfully',
      data: progress,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.message.includes('required') || error.message.includes('Invalid') ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to complete chant',
    });
  }
};

module.exports = {
  startChantForChild,
  getChantProgressForChild,
  completeChantForChild,
};

