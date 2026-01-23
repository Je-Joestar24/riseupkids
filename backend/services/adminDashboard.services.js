const {
  User,
  ChildProfile,
  Course,
  Activity,
  Book,
  CourseProgress,
  ContactSupport,
} = require('../models');

/**
 * Admin Dashboard Service
 *
 * Provides statistics and overview data for the admin dashboard.
 * Direct data aggregation - no extra processing layers.
 */
const getDashboardStats = async () => {
  try {
    // Parallel queries for performance
    const [
      totalParents,
      activeSubscriptions,
      totalTeachers,
      totalChildren,
      totalCourses,
      totalActivities,
      totalBooks,
      totalEnrollments,
      recentSignups,
      pendingSupport,
    ] = await Promise.all([
      // Total parents
      User.countDocuments({ role: 'parent', isActive: true }),

      // Active subscriptions (parents with active Stripe subscriptions)
      User.countDocuments({
        role: 'parent',
        subscriptionStatus: 'active',
        isActive: true,
      }),

      // Total teachers
      User.countDocuments({ role: 'teacher', isActive: true }),

      // Total children (ChildProfiles)
      ChildProfile.countDocuments({ isActive: true }),

      // Total courses
      Course.countDocuments({ isActive: true }),

      // Total activities
      Activity.countDocuments({ isActive: true }),

      // Total books
      Book.countDocuments({ isActive: true }),

      // Total course enrollments/progress
      CourseProgress.countDocuments(),

      // Recent signups (last 7 days)
      User.find({
        role: 'parent',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Pending support requests
      ContactSupport.countDocuments({ status: 'pending' }),
    ]);

    // Calculate subscription percentage
    const subscriptionPercentage =
      totalParents > 0 ? Math.round((activeSubscriptions / totalParents) * 100) : 0;

    return {
      users: {
        totalParents,
        activeSubscriptions,
        subscriptionPercentage,
        totalTeachers,
        totalChildren,
      },
      content: {
        totalCourses,
        totalActivities,
        totalBooks,
      },
      engagement: {
        totalEnrollments,
      },
      recent: {
        recentSignups,
      },
      support: {
        pendingSupport,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
  }
};

module.exports = {
  getDashboardStats,
};
