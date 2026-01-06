const audioAssignmentService = require('../services/audioAssignment.services');

/**
 * @desc    Create new audio assignment
 * @route   POST /api/audio-assignments
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (required)
 * - description: String (optional)
 * - instructions: String (required)
 * - estimatedDuration: Number (optional) - in minutes
 * - starsAwarded: Number (optional, default: 10)
 * - isStarAssignment: Boolean (optional, default: false)
 * - badgeAwarded: String (optional) - Badge ID
 * - tags: JSON String (optional) - Array of tag strings
 * - isPublished: Boolean (optional, default: false)
 * - referenceAudio: File (optional) - Reference/example audio file
 * - coverImage: File (optional) - Cover image for the assignment
 */
const createAudioAssignment = async (req, res) => {
  try {
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create audio assignments',
      });
    }

    const audioAssignment = await audioAssignmentService.createAudioAssignment(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Audio assignment created successfully',
      data: audioAssignment,
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid') || error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create audio assignment',
    });
  }
};

/**
 * @desc    Get all audio assignments
 * @route   GET /api/audio-assignments
 * @access  Private (Admin only)
 * 
 * Query parameters:
 * - isPublished: Filter by published status (true/false)
 * - isStarAssignment: Filter by star assignment status (true/false)
 * - search: Search in title/description/instructions
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 8)
 */
const getAllAudioAssignments = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access audio assignments',
      });
    }

    const result = await audioAssignmentService.getAllAudioAssignments(req.query);

    res.status(200).json({
      success: true,
      message: 'Audio assignments retrieved successfully',
      data: result.audioAssignments,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve audio assignments',
    });
  }
};

/**
 * @desc    Get single audio assignment by ID
 * @route   GET /api/audio-assignments/:id
 * @access  Private (Admin only)
 */
const getAudioAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access audio assignments',
      });
    }

    const audioAssignment = await audioAssignmentService.getAudioAssignmentById(id);

    res.status(200).json({
      success: true,
      message: 'Audio assignment retrieved successfully',
      data: audioAssignment,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve audio assignment',
    });
  }
};

/**
 * @desc    Update audio assignment
 * @route   PUT /api/audio-assignments/:id
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (optional)
 * - description: String (optional)
 * - instructions: String (optional)
 * - estimatedDuration: Number (optional)
 * - starsAwarded: Number (optional)
 * - isStarAssignment: Boolean (optional)
 * - isPublished: Boolean (optional)
 * - coverImage: File (optional) - New cover image
 */
const updateAudioAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update audio assignments',
      });
    }

    const audioAssignment = await audioAssignmentService.updateAudioAssignment(id, userId, req.body, req.files);

    res.status(200).json({
      success: true,
      message: 'Audio assignment updated successfully',
      data: audioAssignment,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('Invalid') || error.message.includes('empty') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update audio assignment',
    });
  }
};

/**
 * @desc    Delete audio assignment
 * @route   DELETE /api/audio-assignments/:id
 * @access  Private (Admin only)
 */
const deleteAudioAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete audio assignments',
      });
    }

    const result = await audioAssignmentService.deleteAudioAssignment(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
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

