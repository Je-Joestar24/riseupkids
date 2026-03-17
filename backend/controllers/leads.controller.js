const { listLeads } = require('../services/lead.services');

/**
 * Admin Leads Controller
 *
 * GET /api/admin/leads
 * Query: page, limit, q, email, language, consent
 */
async function getLeads(req, res, next) {
  try {
    const { page, limit, q, email, language, consent } = req.query || {};

    const result = await listLeads({
      page,
      limit,
      q,
      email,
      language,
      consent,
    });

    return res.status(200).json({
      success: true,
      message: 'Leads retrieved successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getLeads,
};

