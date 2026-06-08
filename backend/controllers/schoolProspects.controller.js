const { listSchoolProspects } = require('../services/schoolProspect.services');

/**
 * Admin School Prospects Controller
 *
 * GET /api/admin/school-prospects
 * Query: page, limit, q, email, language, role, flodeskStatus, cityCountry
 */
async function getSchoolProspects(req, res, next) {
  try {
    const {
      page,
      limit,
      q,
      email,
      language,
      role,
      flodeskStatus,
      cityCountry,
    } = req.query || {};

    const result = await listSchoolProspects({
      page,
      limit,
      q,
      email,
      language,
      role,
      flodeskStatus,
      cityCountry,
    });

    return res.status(200).json({
      success: true,
      message: 'School prospects retrieved successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSchoolProspects,
};
