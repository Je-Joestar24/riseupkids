const chantService = require('../services/chant.services');

const CONTENT_MANAGER_ROLES = ['admin', 'teacher', 'content_creator'];

function resolveErrorStatus(error, { notFound = 404, badRequest = 400, fallback = 500 } = {}) {
  if (error?.statusCode === 403) return 403;
  const message = String(error?.message || '');
  if (message.includes('not found')) return notFound;
  if (message.includes('Invalid') || message.includes('required') || message.includes('empty')) return badRequest;
  return fallback;
}

/**
 * @desc    Create new chant
 * @route   POST /api/chants
 * @access  Private (Admin/Teacher/Content creator)
 */
const createChant = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can create chants',
      });
    }

    const chant = await chantService.createChant(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Chant created successfully',
      data: chant,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to create chant',
    });
  }
};

/**
 * @desc    Get all chants
 * @route   GET /api/chants
 * @access  Private (Admin/Teacher/Content creator)
 */
const getAllChants = async (req, res) => {
  try {
    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can access chants',
      });
    }

    const result = await chantService.getAllChants({ ...req.query, user: req.user });

    res.status(200).json({
      success: true,
      message: 'Chants retrieved successfully',
      data: result.chants,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to retrieve chants',
    });
  }
};

/**
 * @desc    Get single chant by ID
 * @route   GET /api/chants/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const getChantById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can access chants',
      });
    }

    const chant = await chantService.getChantById(id, req.user);

    res.status(200).json({
      success: true,
      message: 'Chant retrieved successfully',
      data: chant,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to retrieve chant',
    });
  }
};

/**
 * @desc    Update chant
 * @route   PUT /api/chants/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const updateChant = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can update chants',
      });
    }

    const chant = await chantService.updateChant(id, userId, req.body, req.files, req.user);

    res.status(200).json({
      success: true,
      message: 'Chant updated successfully',
      data: chant,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to update chant',
    });
  }
};

/**
 * @desc    Delete chant
 * @route   DELETE /api/chants/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const deleteChant = async (req, res) => {
  try {
    const { id } = req.params;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can delete chants',
      });
    }

    const result = await chantService.deleteChant(id, req.user);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
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
