const cmsBookAdminService = require('../services/cmsBookAdmin.service');

function resolveStatusCode(error, fallback = 500) {
  if (error && Number.isInteger(error.statusCode)) return error.statusCode;
  return fallback;
}

const createCmsBook = async (req, res) => {
  try {
    const data = await cmsBookAdminService.createCmsBook({
      userId: req.user?._id,
      payload: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message || 'Failed to create CMS book',
    });
  }
};

const listCmsBooks = async (req, res) => {
  try {
    const data = await cmsBookAdminService.listCmsBooks({
      user: req.user,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      status: req.query.status,
      language: req.query.language,
      includeArchived: req.query.includeArchived === 'true',
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message || 'Failed to list CMS books',
    });
  }
};

const getCmsBookById = async (req, res) => {
  try {
    const data = await cmsBookAdminService.getCmsBookById({
      user: req.user,
      bookId: req.params.id,
      includeArchived: true,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, 404)).json({
      success: false,
      message: error.message || 'Failed to get CMS book',
    });
  }
};

const updateCmsBook = async (req, res) => {
  try {
    const data = await cmsBookAdminService.updateCmsBook({
      user: req.user,
      bookId: req.params.id,
      userId: req.user?._id,
      patch: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || 'Failed to update CMS book',
    });
  }
};

const publishCmsBook = async (req, res) => {
  try {
    const data = await cmsBookAdminService.publishCmsBook({
      user: req.user,
      bookId: req.params.id,
      userId: req.user?._id,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || 'Failed to publish CMS book',
    });
  }
};

const unpublishCmsBook = async (req, res) => {
  try {
    const data = await cmsBookAdminService.unpublishCmsBook({
      user: req.user,
      bookId: req.params.id,
      userId: req.user?._id,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || 'Failed to unpublish CMS book',
    });
  }
};

const archiveCmsBook = async (req, res) => {
  try {
    const data = await cmsBookAdminService.archiveCmsBook({
      user: req.user,
      bookId: req.params.id,
      userId: req.user?._id,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || 'Failed to archive CMS book',
    });
  }
};

const deleteCmsBook = async (req, res) => {
  try {
    const data = await cmsBookAdminService.deleteCmsBook({
      user: req.user,
      bookId: req.params.id,
      userId: req.user?._id,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || 'Failed to delete CMS book',
    });
  }
};

const uploadCmsBookMedia = async (req, res) => {
  try {
    const data = await cmsBookAdminService.uploadCmsBookMedia({
      userId: req.user?._id,
      file: req.file,
      mediaType: req.body?.mediaType,
      title: req.body?.title,
      description: req.body?.description,
      preTrimmed: req.body?.preTrimmed === 'true' || req.body?.preTrimmed === true,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || 'Failed to upload CMS book media',
    });
  }
};

module.exports = {
  createCmsBook,
  listCmsBooks,
  getCmsBookById,
  updateCmsBook,
  publishCmsBook,
  unpublishCmsBook,
  archiveCmsBook,
  deleteCmsBook,
  uploadCmsBookMedia,
};
