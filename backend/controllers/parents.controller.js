const parentsService = require('../services/parents.services');

/**
 * @desc    Get all parents with pagination, search, and filtering
 * @route   GET /api/parents
 * @access  Private (Admin only)
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - search: Search term for name/email
 * - isActive: Filter by active status (true/false)
 * - subscriptionStatus: Filter by subscription status
 * - sortBy: Sort field (default: createdAt)
 * - sortOrder: Sort order (asc/desc, default: desc)
 */
const getAllParents = async (req, res) => {
  try {
    const result = await parentsService.getAllParents(req.query);

    res.status(200).json({
      success: true,
      message: 'Parents retrieved successfully',
      data: result.parents,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve parents',
    });
  }
};

/**
 * @desc    Get single parent by ID
 * @route   GET /api/parents/:id
 * @access  Private (Admin only)
 */
const getParentById = async (req, res) => {
  try {
    const { id } = req.params;
    const parent = await parentsService.getParentById(id);

    res.status(200).json({
      success: true,
      message: 'Parent retrieved successfully',
      data: parent,
    });
  } catch (error) {
    const statusCode = error.message === 'Parent not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve parent',
    });
  }
};

/**
 * @desc    Create new parent
 * @route   POST /api/parents
 * @access  Private (Admin only)
 * 
 * Request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 */
const createParent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const parent = await parentsService.createParent({ name, email, password });

    res.status(201).json({
      success: true,
      message: 'Parent created successfully',
      data: parent,
    });
  } catch (error) {
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create parent',
    });
  }
};

/**
 * @desc    Update parent
 * @route   PUT /api/parents/:id
 * @access  Private (Admin only)
 * 
 * Request body (all fields optional):
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "isActive": true,
 *   "subscriptionStatus": "active"
 * }
 */
const updateParent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const parent = await parentsService.updateParent(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Parent updated successfully',
      data: parent,
    });
  } catch (error) {
    const statusCode = error.message === 'Parent not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update parent',
    });
  }
};

/**
 * @desc    Archive parent (soft delete)
 * @route   DELETE /api/parents/:id
 * @access  Private (Admin only)
 */
const archiveParent = async (req, res) => {
  try {
    const { id } = req.params;
    const parent = await parentsService.archiveParent(id);

    res.status(200).json({
      success: true,
      message: 'Parent archived successfully',
      data: parent,
    });
  } catch (error) {
    const statusCode = error.message === 'Parent not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to archive parent',
    });
  }
};

/**
 * @desc    Restore archived parent
 * @route   PUT /api/parents/:id/restore
 * @access  Private (Admin only)
 */
const restoreParent = async (req, res) => {
  try {
    const { id } = req.params;
    const parent = await parentsService.restoreParent(id);

    res.status(200).json({
      success: true,
      message: 'Parent restored successfully',
      data: parent,
    });
  } catch (error) {
    const statusCode = error.message === 'Parent not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to restore parent',
    });
  }
};

module.exports = {
  getAllParents,
  getParentById,
  createParent,
  updateParent,
  archiveParent,
  restoreParent,
};

