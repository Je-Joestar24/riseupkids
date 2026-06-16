const contentCreatorsService = require('../services/contentCreators.services');

/**
 * Content Creators Controller
 *
 * Admin-only endpoints for managing content creator accounts.
 */

const getAllContentCreators = async (req, res) => {
  try {
    const result = await contentCreatorsService.getAllContentCreators(req.query);
    res.status(200).json({
      success: true,
      message: 'Content creators retrieved successfully',
      data: result.contentCreators,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve content creators',
    });
  }
};

const getContentCreatorById = async (req, res) => {
  try {
    const { id } = req.params;
    const contentCreator = await contentCreatorsService.getContentCreatorById(id);
    res.status(200).json({
      success: true,
      message: 'Content creator retrieved successfully',
      data: contentCreator,
    });
  } catch (error) {
    const statusCode = error.message === 'Content creator not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve content creator',
    });
  }
};

const createContentCreator = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const contentCreator = await contentCreatorsService.createContentCreator({ name, email, password });
    res.status(201).json({
      success: true,
      message: 'Content creator created successfully',
      data: contentCreator,
    });
  } catch (error) {
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create content creator',
    });
  }
};

const updateContentCreator = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...rest } = req.body;

    if (password !== undefined && password !== '' && password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const updateData = password !== undefined ? { ...rest, password } : rest;
    const contentCreator = await contentCreatorsService.updateContentCreator(id, updateData);
    res.status(200).json({
      success: true,
      message: 'Content creator updated successfully',
      data: contentCreator,
    });
  } catch (error) {
    const statusCode = error.message === 'Content creator not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update content creator',
    });
  }
};

const archiveContentCreator = async (req, res) => {
  try {
    const { id } = req.params;
    const contentCreator = await contentCreatorsService.archiveContentCreator(id);
    res.status(200).json({
      success: true,
      message: 'Content creator archived successfully',
      data: contentCreator,
    });
  } catch (error) {
    const statusCode = error.message === 'Content creator not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to archive content creator',
    });
  }
};

const restoreContentCreator = async (req, res) => {
  try {
    const { id } = req.params;
    const contentCreator = await contentCreatorsService.restoreContentCreator(id);
    res.status(200).json({
      success: true,
      message: 'Content creator restored successfully',
      data: contentCreator,
    });
  } catch (error) {
    const statusCode = error.message === 'Content creator not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to restore content creator',
    });
  }
};

module.exports = {
  getAllContentCreators,
  getContentCreatorById,
  createContentCreator,
  updateContentCreator,
  archiveContentCreator,
  restoreContentCreator,
};
