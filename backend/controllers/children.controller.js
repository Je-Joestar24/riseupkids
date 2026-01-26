const childrenService = require('../services/children.services');

/**
 * @desc    Get all children of logged-in parent
 * @route   GET /api/children
 * @access  Private (Parent only)
 * 
 * Query parameters:
 * - isActive: Filter by active status (true/false)
 */
const getAllChildren = async (req, res) => {
  try {
    const parentId = req.user._id;

    // Verify user is a parent
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can access this route',
      });
    }

    const children = await childrenService.getAllChildren(parentId, req.query);

    res.status(200).json({
      success: true,
      message: 'Children retrieved successfully',
      data: children,
      count: children.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve children',
    });
  }
};

/**
 * @desc    Get single child by ID
 * @route   GET /api/children/:id
 * @access  Private (Parent only)
 */
const getChildById = async (req, res) => {
  try {
    const { id } = req.params;
    const parentId = req.user._id;

    // Verify user is a parent
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can access this route',
      });
    }

    const child = await childrenService.getChildById(id, parentId);

    res.status(200).json({
      success: true,
      message: 'Child retrieved successfully',
      data: child,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve child',
    });
  }
};

/**
 * @desc    Create new child profile
 * @route   POST /api/children
 * @access  Private (Parent only)
 * 
 * Request body:
 * {
 *   "displayName": "Emma",
 *   "age": 5,
 *   "avatar": "path/to/avatar.png",
 *   "currentJourney": "journey_id",
 *   "currentLesson": "lesson_id",
 *   "preferences": {
 *     "language": "en",
 *     "theme": "light",
 *     "soundEnabled": true
 *   }
 * }
 */
const createChild = async (req, res) => {
  try {
    const parentId = req.user._id;

    // Verify user is a parent
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can create child profiles',
      });
    }

    const child = await childrenService.createChild(parentId, req.body);

    res.status(201).json({
      success: true,
      message: 'Child profile created successfully',
      data: child,
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create child profile',
    });
  }
};

/**
 * @desc    Update child profile
 * @route   PUT /api/children/:id
 * @access  Private (Parent only)
 * 
 * Request body (all fields optional):
 * {
 *   "displayName": "Emma",
 *   "age": 6,
 *   "avatar": "path/to/avatar.png",
 *   "currentJourney": "journey_id",
 *   "currentLesson": "lesson_id",
 *   "preferences": {
 *     "language": "en",
 *     "theme": "light",
 *     "soundEnabled": true
 *   },
 *   "isActive": true
 * }
 */
const updateChild = async (req, res) => {
  try {
    const { id } = req.params;
    const parentId = req.user._id;

    // Verify user is a parent
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can update child profiles',
      });
    }

    const child = await childrenService.updateChild(id, parentId, req.body);

    res.status(200).json({
      success: true,
      message: 'Child profile updated successfully',
      data: child,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update child profile',
    });
  }
};

/**
 * @desc    Delete child profile (soft delete)
 * @route   DELETE /api/children/:id
 * @access  Private (Parent only)
 */
const deleteChild = async (req, res) => {
  try {
    const { id } = req.params;
    const parentId = req.user._id;

    // Verify user is a parent
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can delete child profiles',
      });
    }

    const child = await childrenService.deleteChild(id, parentId);

    res.status(200).json({
      success: true,
      message: 'Child profile deleted successfully',
      data: child,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete child profile',
    });
  }
};

/**
 * @desc    Restore archived child profile
 * @route   PUT /api/children/:id/restore
 * @access  Private (Parent only)
 */
const restoreChild = async (req, res) => {
  try {
    const { id } = req.params;
    const parentId = req.user._id;

    // Verify user is a parent
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can restore child profiles',
      });
    }

    const child = await childrenService.restoreChild(id, parentId);

    res.status(200).json({
      success: true,
      message: 'Child profile restored successfully',
      data: child,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to restore child profile',
    });
  }
};

/**
 * @desc    Get child profile with full stats, badges, and level info
 * @route   GET /api/children/:id/profile
 * @access  Private (Parent only)
 */
const getChildProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const parentId = req.user._id;

    // Verify user is a parent
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can access this route',
      });
    }

    const child = await childrenService.getChildProfileWithStats(id, parentId);

    res.status(200).json({
      success: true,
      message: 'Child profile retrieved successfully',
      data: child,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve child profile',
    });
  }
};

module.exports = {
  getAllChildren,
  getChildById,
  createChild,
  updateChild,
  deleteChild,
  restoreChild,
  getChildProfile,
};

