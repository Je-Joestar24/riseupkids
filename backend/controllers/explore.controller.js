const exploreService = require('../services/explore.services');

/**
 * @desc    Create new explore content
 * @route   POST /api/explore
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (required)
 * - description: String (optional)
 * - type: String (optional, default: 'video') - Content type
 * - videoType: String (optional, default: 'replay') - 'replay' or 'activity'
 * - category: String (optional) - Category for grouping
 * - starsAwarded: Number (optional, default: 10)
 * - totalItems: Number (optional, default: 0)
 * - order: Number (optional, default: 0)
 * - isFeatured: Boolean (optional, default: false)
 * - isPublished: Boolean (optional, default: false)
 * - tags: JSON String (optional) - Array of tag strings
 * - duration: Number (optional) - Video duration in seconds
 * - videoFile: File (required for video type) - Video file
 * - coverImage: File (optional) - Cover image/thumbnail
 * - activityIcon: File (optional) - SVG icon for activity video type
 */
const createExploreContent = async (req, res) => {
  try {
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create explore content',
      });
    }

    const content = await exploreService.createExploreContent(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Explore content created successfully',
      data: content,
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid') || error.message.includes('required') || error.message.includes('provide') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create explore content',
    });
  }
};

/**
 * @desc    Get all explore content
 * @route   GET /api/explore
 * @access  Private (Admin only for full access, authenticated users for published)
 * 
 * Query parameters:
 * - type: Filter by content type (video, lesson, activity, etc.)
 * - videoType: Filter by video subtype (replay, activity)
 * - category: Filter by category
 * - isPublished: Filter by published status (true/false)
 * - isFeatured: Filter by featured status (true/false)
 * - search: Search in title/description/category
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
const getAllExploreContent = async (req, res) => {
  try {
    // Admin can see all content, others only see published
    if (req.user.role !== 'admin') {
      req.query.isPublished = true;
    }

    const result = await exploreService.getAllExploreContent(req.query);

    res.status(200).json({
      success: true,
      message: 'Explore content retrieved successfully',
      data: result.exploreContent,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve explore content',
    });
  }
};

/**
 * @desc    Get single explore content by ID
 * @route   GET /api/explore/:id
 * @access  Private
 */
const getExploreContentById = async (req, res) => {
  try {
    const { id } = req.params;

    const content = await exploreService.getExploreContentById(id);

    // Non-admin users can only see published content
    if (req.user.role !== 'admin' && !content.isPublished) {
      return res.status(404).json({
        success: false,
        message: 'Explore content not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Explore content retrieved successfully',
      data: content,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve explore content',
    });
  }
};

/**
 * @desc    Update explore content
 * @route   PUT /api/explore/:id
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (optional)
 * - description: String (optional)
 * - videoType: String (optional) - 'replay' or 'activity'
 * - category: String (optional)
 * - starsAwarded: Number (optional)
 * - totalItems: Number (optional)
 * - order: Number (optional)
 * - isFeatured: Boolean (optional)
 * - isPublished: Boolean (optional)
 * - tags: JSON String (optional)
 * - duration: Number (optional)
 * - coverImage: File (optional) - New cover image
 * - activityIcon: File (optional) - New activity icon (SVG)
 */
const updateExploreContent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update explore content',
      });
    }

    const content = await exploreService.updateExploreContent(id, userId, req.body, req.files);

    res.status(200).json({
      success: true,
      message: 'Explore content updated successfully',
      data: content,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('Invalid') || error.message.includes('empty') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update explore content',
    });
  }
};

/**
 * @desc    Delete explore content
 * @route   DELETE /api/explore/:id
 * @access  Private (Admin only)
 */
const deleteExploreContent = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete explore content',
      });
    }

    const result = await exploreService.deleteExploreContent(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete explore content',
    });
  }
};

/**
 * @desc    Get explore content by type
 * @route   GET /api/explore/type/:type
 * @access  Private
 * 
 * Params:
 * - type: Content type (video, lesson, activity, etc.)
 * 
 * Query parameters:
 * - videoType: Filter by video subtype (replay, activity) - only for video type
 * - category: Filter by category
 * - isFeatured: Filter by featured status
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
const getExploreContentByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { videoType } = req.query;

    const result = await exploreService.getExploreContentByType(type, videoType, req.query);

    res.status(200).json({
      success: true,
      message: 'Explore content retrieved successfully',
      data: result.exploreContent,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve explore content',
    });
  }
};

/**
 * @desc    Get featured explore content
 * @route   GET /api/explore/featured
 * @access  Private
 * 
 * Query parameters:
 * - limit: Maximum number of items (default: 10)
 */
const getFeaturedExploreContent = async (req, res) => {
  try {
    const { limit } = req.query;

    const content = await exploreService.getFeaturedExploreContent(limit);

    res.status(200).json({
      success: true,
      message: 'Featured explore content retrieved successfully',
      data: content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve featured explore content',
    });
  }
};

module.exports = {
  createExploreContent,
  getAllExploreContent,
  getExploreContentById,
  updateExploreContent,
  deleteExploreContent,
  getExploreContentByType,
  getFeaturedExploreContent,
};

