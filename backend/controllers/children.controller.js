const childrenService = require('../services/children.services');
const accountDeletionService = require('../services/accountDeletion.service');
const kidsWallConsentService = require('../services/kidsWallConsent.service');

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

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

/**
 * @desc    Enable or disable Kids Wall for a child (requires consent when enabling)
 * @route   PUT /api/children/:id/kids-wall-consent
 * @access  Private (Parent only)
 *
 * Request body:
 * { "enabled": true }
 */
const updateKidsWallConsent = async (req, res) => {
  try {
    const { id } = req.params;
    const parentId = req.user._id;
    const { enabled, consentAcknowledged } = req.body || {};

    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can update Kids Wall consent',
      });
    }

    const child = await kidsWallConsentService.updateKidsWallConsent(id, parentId, {
      enabled,
      consentAcknowledged,
    });

    res.status(200).json({
      success: true,
      message: enabled
        ? 'Kids Wall enabled for this child'
        : 'Kids Wall disabled for this child',
      data: child,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update Kids Wall consent',
    });
  }
};

/**
 * @desc    Request child profile deletion (revokes access immediately; purge via admin/script)
 * @route   POST /api/children/:id/request-deletion
 * @access  Private (Parent only)
 */
const requestChildDeletion = async (req, res) => {
  try {
    const { id } = req.params;
    const parentId = req.user._id;
    const { password, confirmText } = req.body || {};

    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can delete child profiles',
      });
    }

    const result = await accountDeletionService.requestChildProfileDeletion(parentId, id, {
      password,
      confirmText,
      requesterIp: getClientIp(req),
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to submit child deletion request',
    });
  }
};

module.exports = {
  getAllChildren,
  getChildById,
  createChild,
  updateChild,
  updateKidsWallConsent,
  requestChildDeletion,
  getChildProfile,
};

