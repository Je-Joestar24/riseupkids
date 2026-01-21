const chantService = require('../services/chant.services');

/**
 * @desc    Create new chant
 * @route   POST /api/chants
 * @access  Private (Admin/Teacher only)
 * 
 * Request (multipart/form-data):
 * - title: String (required)
 * - description: String (optional)
 * - instructions: String (optional)
 * - estimatedDuration: Number (optional) - in minutes
 * - starsAwarded: Number (optional, default: 10)
 * - badgeAwarded: String (optional) - Badge ID
 * - tags: JSON String (optional) - Array of tag strings
 * - isPublished: Boolean (optional, default: false)
 * - audio: File (optional) - Audio file
 * - scormFile: File (optional) - SCORM ZIP file
 * - coverImage: File (optional) - Cover image for the chant
 */
const createChant = async (req, res) => {
  try {
    const userId = req.user._id;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can create chants',
      });
    }

    const chant = await chantService.createChant(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Chant created successfully',
      data: chant,
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid') || error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create chant',
    });
  }
};

/**
 * @desc    Get all chants
 * @route   GET /api/chants
 * @access  Private (Admin/Teacher only)
 * 
 * Query parameters:
 * - isPublished: Filter by published status (true/false)
 * - search: Search in title/description/instructions
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
const getAllChants = async (req, res) => {
  try {
    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can access chants',
      });
    }

    const result = await chantService.getAllChants(req.query);

    res.status(200).json({
      success: true,
      message: 'Chants retrieved successfully',
      data: result.chants,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve chants',
    });
  }
};

/**
 * @desc    Get single chant by ID
 * @route   GET /api/chants/:id
 * @access  Private (Admin/Teacher only)
 */
const getChantById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can access chants',
      });
    }

    const chant = await chantService.getChantById(id);

    res.status(200).json({
      success: true,
      message: 'Chant retrieved successfully',
      data: chant,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve chant',
    });
  }
};

/**
 * @desc    Update chant
 * @route   PUT /api/chants/:id
 * @access  Private (Admin/Teacher only)
 * 
 * Request (multipart/form-data):
 * - title: String (optional)
 * - description: String (optional)
 * - instructions: String (optional)
 * - estimatedDuration: Number (optional) - in minutes
 * - starsAwarded: Number (optional)
 * - coverImage: File (optional) - New cover image/thumbnail
 */
const updateChant = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can update chants',
      });
    }

    const chant = await chantService.updateChant(id, userId, req.body, req.files);

    res.status(200).json({
      success: true,
      message: 'Chant updated successfully',
      data: chant,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('Invalid') || error.message.includes('empty') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update chant',
    });
  }
};

/**
 * @desc    Delete chant
 * @route   DELETE /api/chants/:id
 * @access  Private (Admin/Teacher only)
 */
const deleteChant = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can delete chants',
      });
    }

    const result = await chantService.deleteChant(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete chant',
    });
  }
};

module.exports = {
  createChant,
  getAllChants,
  getChantById,
  updateChant,
  deleteChant,
};
