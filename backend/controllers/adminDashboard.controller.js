const { getDashboardStats } = require('../services/adminDashboard.services');

/**
 * Admin Dashboard Controller
 *
 * GET /api/admin/dashboard
 * Returns comprehensive dashboard statistics for admin users.
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await getDashboardStats();

    res.status(200).json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
