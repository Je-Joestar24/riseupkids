const Badge = require('../models/Badge');
const ChildStats = require('../models/ChildStats');

/**
 * @desc    Get all badges (for display)
 * @route   GET /api/badges
 * @access  Private (Parent only)
 * 
 * Returns all active badges sorted by order
 */
const getAllBadges = async (req, res) => {
  try {
    const badges = await Badge.find({ isActive: true })
      .select('name description category rarity order criteria')
      .sort({ order: 1, category: 1 })
      .lean();

    res.status(200).json({
      success: true,
      message: 'Badges retrieved successfully',
      data: badges,
      count: badges.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve badges',
    });
  }
};

/**
 * @desc    Get child's latest badges earned (limit 5)
 * @route   GET /api/badges/child/:childId/latest
 * @access  Private (Parent only)
 * 
 * Returns latest badges earned by child (last 5 badges from the array)
 * Since badges are added in order, the last items in the array are the most recent
 */
const getChildLatestBadges = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user._id;

    // Verify user is a parent
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can access this route',
      });
    }

    // Get child stats with badges populated
    const stats = await ChildStats.findOne({ child: childId })
      .populate({
        path: 'badges',
        select: 'name description category rarity order',
      })
      .lean();

    if (!stats || !stats.badges || stats.badges.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No badges earned yet',
        data: [],
        count: 0,
      });
    }

    // Get last 5 badges (most recently added are at the end of the array)
    // Reverse to show most recent first
    const latestBadges = stats.badges.slice(-5).reverse();

    res.status(200).json({
      success: true,
      message: 'Latest badges retrieved successfully',
      data: latestBadges,
      count: latestBadges.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve latest badges',
    });
  }
};

module.exports = {
  getAllBadges,
  getChildLatestBadges,
};
