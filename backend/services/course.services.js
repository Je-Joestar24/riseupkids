const { ActivityGroup, Activity, Badge } = require('../models');

/**
 * Create Activity Group Service
 * 
 * Creates a new activity group with existing activities
 * Activities must be created separately and referenced by ID
 * 
 * @param {String} userId - Admin user's MongoDB ID
 * @param {Object} groupData - Activity group data
 * @param {String} groupData.title - Group title (required)
 * @param {String} [groupData.description] - Group description
 * @param {Array<String>} groupData.activities - Array of existing activity IDs (required)
 * @param {String} [groupData.coverImage] - Cover image path or URL
 * @param {String} [groupData.category] - Category (e.g., "Arts & Crafts", "Math")
 * @param {Number} [groupData.order] - Display order
 * @param {Number} [groupData.starsAwarded] - Stars for completing all activities (default: 50)
 * @param {String} [groupData.badgeAwarded] - Badge ID for group completion
 * @param {Boolean} [groupData.isFeatured] - Featured flag
 * @param {Boolean} [groupData.isPublished] - Published flag
 * @param {Array<String>} [groupData.tags] - Tags array
 * @returns {Object} Created activity group with populated activities
 * @throws {Error} If validation fails or activities not found
 */
const createActivityGroup = async (userId, groupData) => {
  const {
    title,
    description,
    activities,
    coverImage,
    category,
    order,
    starsAwarded,
    badgeAwarded,
    isFeatured,
    isPublished,
    tags,
  } = groupData;

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide a group title');
  }

  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    throw new Error('Please provide at least one activity ID');
  }

  // Validate that all activities exist
  const activityIds = activities.filter(id => id); // Remove null/undefined
  if (activityIds.length === 0) {
    throw new Error('Please provide valid activity IDs');
  }

  // Check if all activities exist
  const existingActivities = await Activity.find({
    _id: { $in: activityIds },
  }).select('_id');

  if (existingActivities.length !== activityIds.length) {
    const foundIds = existingActivities.map(a => a._id.toString());
    const missingIds = activityIds.filter(id => !foundIds.includes(id.toString()));
    throw new Error(`Some activities not found: ${missingIds.join(', ')}`);
  }

  // Validate badge if provided
  if (badgeAwarded) {
    const badge = await Badge.findById(badgeAwarded);
    if (!badge) {
      throw new Error('Invalid badge ID');
    }
  }

  // Create activity group
  const activityGroup = await ActivityGroup.create({
    title: title.trim(),
    description: description?.trim() || null,
    activities: activityIds,
    coverImage: coverImage || null,
    category: category?.trim() || null,
    order: order !== undefined ? parseInt(order, 10) : 0,
    starsAwarded: starsAwarded !== undefined ? parseInt(starsAwarded, 10) : 50,
    badgeAwarded: badgeAwarded || null,
    isFeatured: isFeatured !== undefined ? isFeatured : false,
    isPublished: isPublished !== undefined ? isPublished : false,
    createdBy: userId,
    tags: tags && Array.isArray(tags) ? tags.filter(t => t && t.trim()) : [],
  });

  // Get created group with populated activities
  const createdGroup = await ActivityGroup.findById(activityGroup._id)
    .populate({
      path: 'activities',
      select: 'title description type instructions media questions autoComplete maxScore estimatedTime starsAwarded badgeAwarded tags isPublished createdAt',
      populate: {
        path: 'media',
        select: 'type url thumbnailUrl',
      },
    })
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return createdGroup;
};

/**
 * Get Activity Group with Activities Service
 * 
 * Retrieves a single activity group with all activities populated
 * 
 * @param {String} groupId - Activity group's MongoDB ID
 * @param {Object} options - Optional query options
 * @param {Boolean} options.includeUnpublished - Include unpublished activities (admin only)
 * @returns {Object} Activity group with populated activities
 * @throws {Error} If group not found
 */
const getActivityGroupById = async (groupId, options = {}) => {
  const { includeUnpublished = false } = options;

  // Build activity query
  const activityQuery = includeUnpublished ? {} : { isPublished: true };

  // Get activity group with populated activities
  const activityGroup = await ActivityGroup.findById(groupId)
    .populate({
      path: 'activities',
      match: activityQuery,
      select: 'title description type instructions media questions autoComplete maxScore estimatedTime starsAwarded badgeAwarded tags isPublished createdAt',
      populate: {
        path: 'media',
        select: 'type url thumbnailUrl',
      },
    })
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  if (!activityGroup) {
    throw new Error('Activity group not found');
  }

  // Filter out null activities (if match didn't find any)
  if (activityGroup.activities) {
    activityGroup.activities = activityGroup.activities.filter(a => a !== null);
  }

  // Add activity count
  activityGroup.activityCount = activityGroup.activities ? activityGroup.activities.length : 0;

  return activityGroup;
};

module.exports = {
  createActivityGroup,
  getActivityGroupById,
};

