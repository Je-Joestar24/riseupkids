const moduleAccessService = require('../services/moduleAccess.services');

const handleError = (res, error, fallback = 'Module access request failed') => {
  const message = error.message || fallback;
  const notFound =
    /not found/i.test(message) || /invalid child/i.test(message) || /invalid course/i.test(message);
  const badRequest =
    /cannot be locked/i.test(message) ||
    /cannot be unlocked/i.test(message) ||
    /not available/i.test(message) ||
    /no progress/i.test(message);

  const status = notFound ? 404 : badRequest ? 400 : 500;
  return res.status(status).json({
    success: false,
    message,
  });
};

/**
 * GET /api/admin/module-access
 */
const listChildren = async (req, res) => {
  try {
    const result = await moduleAccessService.listChildrenForModuleAccess(req.query);
    return res.status(200).json({
      success: true,
      message: 'Children loaded',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[module-access] listChildren:', error);
    return handleError(res, error, 'Failed to list children');
  }
};

/**
 * GET /api/admin/module-access/children/:childId
 */
const getChildDetail = async (req, res) => {
  try {
    const detail = await moduleAccessService.getChildModuleAccessDetail(req.params.childId);
    return res.status(200).json({
      success: true,
      message: 'Child module access loaded',
      data: detail,
    });
  } catch (error) {
    console.error('[module-access] getChildDetail:', error);
    return handleError(res, error, 'Failed to load child modules');
  }
};

/**
 * POST /api/admin/module-access/children/:childId/courses/:courseId/unlock
 */
const unlockModule = async (req, res) => {
  try {
    const detail = await moduleAccessService.unlockModuleForChild(
      req.params.childId,
      req.params.courseId,
      req.user?._id,
      req.body?.note
    );
    return res.status(200).json({
      success: true,
      message: 'Module unlocked for child',
      data: detail,
    });
  } catch (error) {
    console.error('[module-access] unlockModule:', error);
    return handleError(res, error, 'Failed to unlock module');
  }
};

/**
 * POST /api/admin/module-access/children/:childId/courses/:courseId/lock
 */
const lockModule = async (req, res) => {
  try {
    const detail = await moduleAccessService.lockModuleForChild(
      req.params.childId,
      req.params.courseId,
      req.user?._id,
      req.body?.note
    );
    return res.status(200).json({
      success: true,
      message: 'Module locked for child',
      data: detail,
    });
  } catch (error) {
    console.error('[module-access] lockModule:', error);
    return handleError(res, error, 'Failed to lock module');
  }
};

/**
 * POST /api/admin/module-access/children/:childId/courses/:courseId/clear-override
 */
const clearOverride = async (req, res) => {
  try {
    const detail = await moduleAccessService.clearModuleOverride(
      req.params.childId,
      req.params.courseId,
      req.user?._id,
      req.body?.note
    );
    return res.status(200).json({
      success: true,
      message: 'Module access override cleared',
      data: detail,
    });
  } catch (error) {
    console.error('[module-access] clearOverride:', error);
    return handleError(res, error, 'Failed to clear override');
  }
};

module.exports = {
  listChildren,
  getChildDetail,
  unlockModule,
  lockModule,
  clearOverride,
};
