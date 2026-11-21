const contentCreatorsService = require('../services/contentCreators.services');
const { respondWithAccessError } = require('../utils/accessErrors');

/**
 * Content Creators Controller
 *
 * Admin-only endpoints for managing content creator accounts.
 *
 * Errors about access (a bad list, an unknown creator, ...) are typed (utils/accessErrors.js) and answered here with
 * their own status and code. The access endpoints hand every OTHER error to the central error handler, so an
 * unexpected failure is a 500 with a generic message in production, never the raw error text.
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
    if (respondWithAccessError(res, error)) return;
    const statusCode = error.message === 'Content creator not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve content creator',
    });
  }
};

/** The checkboxes the admin form draws, and which of them a current creator has today. */
const getAccessAreas = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access areas retrieved successfully',
    data: contentCreatorsService.getAccessAreaOptions(),
  });
};

const createContentCreator = async (req, res) => {
  try {
    const { name, email, password, accessAreas } = req.body;

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

    const contentCreator = await contentCreatorsService.createContentCreator(
      { name, email, password, accessAreas },
      { actorId: req.user?._id }
    );
    res.status(201).json({
      success: true,
      message: 'Content creator created successfully',
      data: contentCreator,
    });
  } catch (error) {
    if (respondWithAccessError(res, error)) return;
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
    const contentCreator = await contentCreatorsService.updateContentCreator(id, updateData, {
      actorId: req.user?._id,
    });
    res.status(200).json({
      success: true,
      message: 'Content creator updated successfully',
      data: contentCreator,
    });
  } catch (error) {
    if (respondWithAccessError(res, error)) return;
    const statusCode = error.message === 'Content creator not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update content creator',
    });
  }
};

/** Manage access: PUT /:id/access  { accessAreas: [...] } */
const setContentCreatorAccess = async (req, res, next) => {
  try {
    const result = await contentCreatorsService.setContentCreatorAccess(req.params.id, req.body?.accessAreas, {
      actorId: req.user?._id,
    });
    res.status(200).json({
      success: true,
      message: result.changed ? 'Access updated successfully' : 'Access was already set this way',
      data: result.creator,
      previousAccessAreas: result.previousAccessAreas,
      changed: result.changed,
    });
  } catch (error) {
    if (respondWithAccessError(res, error)) return;
    next(error);
  }
};

/** Bulk manage access: PUT /access/bulk  { ids: [...], accessAreas: [...] } */
const setContentCreatorAccessBulk = async (req, res, next) => {
  try {
    const result = await contentCreatorsService.setContentCreatorAccessBulk(req.body?.ids, req.body?.accessAreas, {
      actorId: req.user?._id,
    });
    res.status(200).json({
      success: true,
      message: `Access updated for ${result.changed} ${result.changed === 1 ? 'person' : 'people'}`,
      data: result.results,
      matched: result.matched,
      changed: result.changed,
    });
  } catch (error) {
    if (respondWithAccessError(res, error)) return;
    next(error);
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
    if (respondWithAccessError(res, error)) return;
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
    if (respondWithAccessError(res, error)) return;
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
  getAccessAreas,
  createContentCreator,
  updateContentCreator,
  setContentCreatorAccess,
  setContentCreatorAccessBulk,
  archiveContentCreator,
  restoreContentCreator,
};
