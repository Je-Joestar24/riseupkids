const audioAssignmentProgressService = require('../services/audioAssignmentProgress.services');
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
 * @desc    Start an audio assignment for a child (create progress if missing)
 * @route   POST /api/audio-assignments/:id/child/:childId/start
 * @access  Private (Parent/Admin)
 */
const startAudioAssignmentForChild = async (req, res) => {
  try {
    const { id: audioAssignmentId, childId } = req.params;

    await verifyChildAccessForParent(req, childId);

    const progress = await audioAssignmentProgressService.startAudioAssignment({
      childId,
      audioAssignmentId,
    });

    res.status(200).json({
      success: true,
      message: 'Audio assignment started',
      data: progress,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.message.includes('not found') ? 404 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to start audio assignment',
    });
  }
};

/**
 * @desc    Get audio assignment progress for a child
 * @route   GET /api/audio-assignments/:id/child/:childId/progress
 * @access  Private (Parent/Admin/Teacher)
 */
const getAudioAssignmentProgressForChild = async (req, res) => {
  try {
    const { id: audioAssignmentId, childId } = req.params;

    await verifyChildAccessForParent(req, childId);

    const progress = await audioAssignmentProgressService.getAudioAssignmentProgress({
      childId,
      audioAssignmentId,
    });

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.message.includes('not found') ? 404 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get audio assignment progress',
    });
  }
};

/**
 * @desc    Submit child's recorded audio for an audio assignment
 * @route   POST /api/audio-assignments/:id/child/:childId/submit
 * @access  Private (Parent/Admin)
 *
 * Request (multipart/form-data):
 * - recordedAudio: File (required) - child's recording
 * - timeSpent: Number (optional) - seconds
 * - metadata: JSON String (optional)
 */
const submitAudioAssignmentForChild = async (req, res) => {
  try {
    const { id: audioAssignmentId, childId } = req.params;

    await verifyChildAccessForParent(req, childId);

    let parsedMetadata = undefined;
    if (req.body?.metadata) {
      try {
        parsedMetadata = typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata;
      } catch (e) {
        parsedMetadata = undefined;
      }
    }

    const progress = await audioAssignmentProgressService.submitAudioAssignmentRecording({
      childId,
      audioAssignmentId,
      uploadedByUserId: req.user._id,
      recordedAudioFile: req.file,
      timeSpent: req.body?.timeSpent,
      metadata: parsedMetadata,
    });

    res.status(200).json({
      success: true,
      message: 'Audio assignment submitted successfully',
      data: progress,
    });
  } catch (error) {
    const statusCode =
      error.statusCode ||
      (error.message.includes('required') || error.message.includes('Invalid') ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to submit audio assignment',
    });
  }
};

/**
 * @desc    List audio assignment submissions for review
 * @route   GET /api/audio-assignments/submissions
 * @access  Private (Admin/Teacher)
 */
const listAudioAssignmentSubmissions = async (req, res) => {
  try {
    const result = await audioAssignmentProgressService.listAudioAssignmentSubmissions(req.query);

    res.status(200).json({
      success: true,
      data: result.submissions,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to list submissions',
    });
  }
};

/**
 * @desc    Review a submitted audio assignment (approve/reject)
 * @route   POST /api/audio-assignments/:id/child/:childId/review
 * @access  Private (Admin/Teacher)
 *
 * Request body:
 * {
 *   "decision": "approved" | "rejected",
 *   "feedback": "string (optional)"
 * }
 */
const reviewAudioAssignmentSubmission = async (req, res) => {
  try {
    const { id: audioAssignmentId, childId } = req.params;
    const { decision, feedback } = req.body || {};

    const reviewed = await audioAssignmentProgressService.reviewAudioAssignmentSubmission({
      childId,
      audioAssignmentId,
      reviewerUserId: req.user._id,
      decision,
      feedback,
    });

    res.status(200).json({
      success: true,
      message: `Submission ${decision} successfully`,
      data: reviewed,
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid') ? 400 : (error.message.includes('not found') ? 404 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to review submission',
    });
  }
};

module.exports = {
  startAudioAssignmentForChild,
  getAudioAssignmentProgressForChild,
  submitAudioAssignmentForChild,
  listAudioAssignmentSubmissions,
  reviewAudioAssignmentSubmission,
};

