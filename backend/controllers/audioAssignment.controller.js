const audioAssignmentService = require('../services/audioAssignment.services');

const CONTENT_MANAGER_ROLES = ['admin', 'teacher', 'content_creator'];

function resolveErrorStatus(error, { notFound = 404, badRequest = 400, fallback = 500 } = {}) {
  if (error?.statusCode === 403) return 403;
  const message = String(error?.message || '');
  if (message.includes('not found')) return notFound;
  if (message.includes('Invalid') || message.includes('required') || message.includes('empty')) return badRequest;
  return fallback;
}

/**
 * @desc    Create new audio assignment
 * @route   POST /api/audio-assignments
 * @access  Private (Admin/Teacher/Content creator)
 */
const createAudioAssignment = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can create audio assignments',
      });
    }

    const audioAssignment = await audioAssignmentService.createAudioAssignment(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Audio assignment created successfully',
      data: audioAssignment,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to create audio assignment',
    });
  }
};

/**
 * @desc    Get all audio assignments
 * @route   GET /api/audio-assignments
 * @access  Private (Admin/Teacher/Content creator)
 */
const getAllAudioAssignments = async (req, res) => {
  try {
    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can access audio assignments',
      });
    }

    const result = await audioAssignmentService.getAllAudioAssignments({ ...req.query, user: req.user });

    res.status(200).json({
      success: true,
      message: 'Audio assignments retrieved successfully',
      data: result.audioAssignments,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to retrieve audio assignments',
    });
  }
};

/**
 * @desc    Get single audio assignment by ID
 * @route   GET /api/audio-assignments/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const getAudioAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can access audio assignments',
      });
    }

    const audioAssignment = await audioAssignmentService.getAudioAssignmentById(id, req.user);

    res.status(200).json({
      success: true,
      message: 'Audio assignment retrieved successfully',
      data: audioAssignment,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to retrieve audio assignment',
    });
  }
};

/**
 * @desc    Update audio assignment
 * @route   PUT /api/audio-assignments/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const updateAudioAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can update audio assignments',
      });
    }

    const audioAssignment = await audioAssignmentService.updateAudioAssignment(id, userId, req.body, req.files, req.user);

    res.status(200).json({
      success: true,
      message: 'Audio assignment updated successfully',
      data: audioAssignment,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to update audio assignment',
    });
  }
};

/**
 * @desc    Delete audio assignment
 * @route   DELETE /api/audio-assignments/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const deleteAudioAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can delete audio assignments',
      });
    }

    const result = await audioAssignmentService.deleteAudioAssignment(id, req.user);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to delete audio assignment',
    });
  }
};

module.exports = {
  createAudioAssignment,
  getAllAudioAssignments,
  getAudioAssignmentById,
  updateAudioAssignment,
  deleteAudioAssignment,
};
