const cmsBookPlayerService = require('../services/cmsBookPlayer.service');

function resolveStatusCode(error, fallback = 500) {
  if (error && Number.isInteger(error.statusCode)) return error.statusCode;
  return fallback;
}

const listPlayableBooks = async (req, res) => {
  try {
    const data = await cmsBookPlayerService.listPlayableCmsBooksForParent({
      user: req.user,
      userRole: req.user?.role,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      language: req.query.language,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({
      success: false,
      message: error.message || 'Failed to list playable books',
    });
  }
};

const getPlayableBookById = async (req, res) => {
  try {
    const data = await cmsBookPlayerService.getPlayableCmsBookForParent({
      user: req.user,
      userRole: req.user?.role,
      bookId: req.params.id,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, 404)).json({
      success: false,
      message: error.message || 'Failed to get playable book',
    });
  }
};

module.exports = {
  listPlayableBooks,
  getPlayableBookById,
};
