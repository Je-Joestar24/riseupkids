const ChildStats = require('../models/ChildStats');
const Badge = require('../models/Badge');
const StarEarning = require('../models/StarEarning');
const badgeAward = require('./badgeAward.service');

/**
 * Badge Checking Service
 * 
 * Checks and awards badges when child stats are updated
 * Should be called after stars are added or stats are updated
 * 
 * Supports:
 * - Level badges (automatically awarded when level is reached)
 * - Milestone badges (based on total stars)
 * - Content-type-specific badges (books, music, etc.)
 * - Streak badges
 * - Completion badges
 */

/**
 * Check and award level badges (based on total stars)
 * Levels are automatically considered as badges
 * @param {String} childId - Child profile ID
 * @param {Number} totalStars - Current total stars
 * @returns {Promise<void>}
 */
const checkLevelBadges = async (childId, totalStars) => {
  try {
    // Find all level badges with total_stars criteria
    const levelBadges = await Badge.find({
      category: 'level',
      'criteria.type': 'total_stars',
      isActive: true,
    }).sort({ 'criteria.value': 1 }); // Sort by threshold ascending

    const stats = await ChildStats.getOrCreate(childId);
    const earnedBadgeIds = stats.badges.map((b) => b.toString());

    for (const badge of levelBadges) {
      // Check if child already has this badge
      if (earnedBadgeIds.includes(badge._id.toString())) {
        continue;
      }

      // Check if criteria is met
      if (totalStars >= badge.criteria.value) {
        await badgeAward.awardBadge(childId, badge._id);
        console.log(`[BadgeCheck] ✅ Awarded level badge "${badge.name}" to child ${childId} (${totalStars} stars)`);
        
        // TODO: Trigger notification/event for frontend
      }
    }
  } catch (error) {
    console.error(`[BadgeCheck] Error checking level badges for child ${childId}:`, error);
  }
};

/**
 * Check and award milestone badges (non-level badges based on total stars)
 * @param {String} childId - Child profile ID
 * @param {Number} totalStars - Current total stars
 * @returns {Promise<void>}
 */
const checkMilestoneBadges = async (childId, totalStars) => {
  try {
    // Find milestone badges (excluding level badges)
    const milestoneBadges = await Badge.find({
      category: 'milestone',
      'criteria.type': 'total_stars',
      isActive: true,
    });

    const stats = await ChildStats.getOrCreate(childId);
    const earnedBadgeIds = stats.badges.map((b) => b.toString());

    for (const badge of milestoneBadges) {
      if (earnedBadgeIds.includes(badge._id.toString())) {
        continue;
      }

      if (totalStars >= badge.criteria.value) {
        await badgeAward.awardBadge(childId, badge._id);
        console.log(`[BadgeCheck] ✅ Awarded milestone badge "${badge.name}" to child ${childId} (${totalStars} stars)`);
      }
    }
  } catch (error) {
    console.error(`[BadgeCheck] Error checking milestone badges for child ${childId}:`, error);
  }
};

/**
 * Calculate stars from specific content type
 * @param {String} childId - Child profile ID
 * @param {String} contentType - Content type (e.g., 'book', 'music', 'arts_crafts')
 * @returns {Promise<Number>} Total stars from this content type
 */
const getStarsFromContentType = async (childId, contentType) => {
  try {
    // Map content types to StarEarning source types
    const sourceTypeMap = {
      book: 'book',
      music: 'explore_video', // Need to filter by videoType in metadata
      arts_crafts: 'explore_video',
      cooking: 'explore_video',
      movement_fitness: 'explore_video',
      story_time: 'explore_video',
      manners_etiquette: 'explore_video',
    };

    const sourceType = sourceTypeMap[contentType];
    if (!sourceType) return 0;

    if (contentType === 'book') {
      // Direct query for books
      const bookEarnings = await StarEarning.find({
        child: childId,
        'source.type': 'book',
      });
      return bookEarnings.reduce((sum, earning) => sum + (earning.stars || 0), 0);
    } else {
      // For explore videos, filter by videoType in metadata
      const videoEarnings = await StarEarning.find({
        child: childId,
        'source.type': 'explore_video',
        'source.metadata.videoType': contentType,
      });
      return videoEarnings.reduce((sum, earning) => sum + (earning.stars || 0), 0);
    }
  } catch (error) {
    console.error(`[BadgeCheck] Error calculating stars from ${contentType} for child ${childId}:`, error);
    return 0;
  }
};

/**
 * Check and award content-type-specific badges
 * @param {String} childId - Child profile ID
 * @param {String} contentType - Content type (e.g., 'book', 'music')
 * @param {Number} starsFromType - Stars earned from this content type
 * @returns {Promise<void>}
 */
const checkContentTypeBadges = async (childId, contentType, starsFromType) => {
  try {
    // Find badges for this content type
    const contentTypeBadges = await Badge.find({
      category: { $in: ['milestone', 'explore'] },
      'criteria.metadata.contentType': contentType,
      isActive: true,
    });

    const stats = await ChildStats.getOrCreate(childId);
    const earnedBadgeIds = stats.badges.map((b) => b.toString());

    for (const badge of contentTypeBadges) {
      if (earnedBadgeIds.includes(badge._id.toString())) {
        continue;
      }

      if (starsFromType >= badge.criteria.value) {
        await badgeAward.awardBadge(childId, badge._id);
        console.log(`[BadgeCheck] ✅ Awarded ${contentType} badge "${badge.name}" to child ${childId} (${starsFromType} stars from ${contentType})`);
      }
    }
  } catch (error) {
    console.error(`[BadgeCheck] Error checking ${contentType} badges for child ${childId}:`, error);
  }
};

/**
 * Check streak badges
 * @param {String} childId - Child profile ID
 * @param {Number} currentStreak - Current streak
 * @param {Number} longestStreak - Longest streak achieved
 * @returns {Promise<void>}
 */
const checkStreakBadges = async (childId, currentStreak, longestStreak) => {
  try {
    const streakBadges = await Badge.find({
      category: 'streak',
      'criteria.type': 'streak_days',
      isActive: true,
    });

    const stats = await ChildStats.getOrCreate(childId);
    const earnedBadgeIds = stats.badges.map((b) => b.toString());

    for (const badge of streakBadges) {
      if (earnedBadgeIds.includes(badge._id.toString())) {
        continue;
      }

      // Check current streak or longest streak based on badge criteria
      const checkLongest = badge.criteria.metadata?.checkLongest || false;
      const streakToCheck = checkLongest ? longestStreak : currentStreak;

      if (streakToCheck >= badge.criteria.value) {
        await badgeAward.awardBadge(childId, badge._id);
        console.log(`[BadgeCheck] ✅ Awarded streak badge "${badge.name}" to child ${childId} (${streakToCheck} day streak)`);
      }
    }
  } catch (error) {
    console.error(`[BadgeCheck] Error checking streak badges for child ${childId}:`, error);
  }
};

/**
 * Check completion badges (activities, lessons, etc.)
 * @param {String} childId - Child profile ID
 * @param {Object} stats - ChildStats document
 * @returns {Promise<void>}
 */
const checkCompletionBadges = async (childId, stats) => {
  try {
    const completionBadges = await Badge.find({
      category: 'completion',
      isActive: true,
    });

    const earnedBadgeIds = stats.badges.map((b) => b.toString());

    for (const badge of completionBadges) {
      if (earnedBadgeIds.includes(badge._id.toString())) {
        continue;
      }

      let criteriaMet = false;
      const criteriaType = badge.criteria.type;

      switch (criteriaType) {
        case 'activities_completed':
          criteriaMet = (stats.totalActivitiesCompleted || 0) >= badge.criteria.value;
          break;
        case 'lessons_completed':
          criteriaMet = (stats.totalLessonsCompleted || 0) >= badge.criteria.value;
          break;
        case 'journeys_completed':
          criteriaMet = (stats.totalJourneysCompleted || 0) >= badge.criteria.value;
          break;
        case 'books_read':
          criteriaMet = (stats.totalBooksRead || 0) >= badge.criteria.value;
          break;
        case 'videos_watched':
          criteriaMet = (stats.totalVideosWatched || 0) >= badge.criteria.value;
          break;
        case 'audio_assignments_completed':
          criteriaMet = (stats.totalAudioAssignmentsCompleted || 0) >= badge.criteria.value;
          break;
        default:
          break;
      }

      if (criteriaMet) {
        await badgeAward.awardBadge(childId, badge._id);
        console.log(`[BadgeCheck] ✅ Awarded completion badge "${badge.name}" to child ${childId}`);
      }
    }
  } catch (error) {
    console.error(`[BadgeCheck] Error checking completion badges for child ${childId}:`, error);
  }
};

/**
 * Main function to check all badges after stats update
 * Should be called after stars are added or stats are updated
 * @param {String} childId - Child profile ID
 * @returns {Promise<void>}
 */
const checkAllBadges = async (childId) => {
  try {
    const stats = await ChildStats.getOrCreate(childId);

    // Check level badges first (levels are instantly considered as badges)
    await checkLevelBadges(childId, stats.totalStars);

    // Check milestone badges (non-level badges based on total stars)
    await checkMilestoneBadges(childId, stats.totalStars);

    // Check content-type-specific badges
    const contentTypes = [
      'book',
      'music',
      'arts_crafts',
      'cooking',
      'movement_fitness',
      'story_time',
      'manners_etiquette',
    ];

    for (const contentType of contentTypes) {
      const starsFromType = await getStarsFromContentType(childId, contentType);
      await checkContentTypeBadges(childId, contentType, starsFromType);
    }

    // Check streak badges
    await checkStreakBadges(childId, stats.currentStreak, stats.longestStreak);

    // Check completion badges
    await checkCompletionBadges(childId, stats);
  } catch (error) {
    console.error(`[BadgeCheck] Error checking all badges for child ${childId}:`, error);
  }
};

/**
 * Reusable utility function to update and check badges for a child
 * 
 * This is the main function to call after ANY stats update (stars, streak, activities, etc.)
 * It automatically checks all badge criteria and awards badges if conditions are met.
 * 
 * Usage:
 *   const badgeCheck = require('./services/badgeCheck.service');
 *   await badgeCheck.updateBadges(childId);
 * 
 * @param {String|ObjectId} childId - Child profile ID
 * @param {Object} options - Optional configuration
 * @param {Boolean} options.silent - If true, suppresses console logs (default: false)
 * @param {Boolean} options.throwOnError - If true, throws error instead of logging (default: false)
 * @returns {Promise<Object>} Result object with success status and any newly awarded badges
 * 
 * @example
 * // After awarding stars
 * await childStats.addStars(10);
 * await badgeCheck.updateBadges(childId);
 * 
 * @example
 * // After updating streak
 * await childStats.updateStreak();
 * await badgeCheck.updateBadges(childId);
 * 
 * @example
 * // With options
 * const result = await badgeCheck.updateBadges(childId, { silent: true });
 * if (result.success && result.newBadges.length > 0) {
 *   console.log(`Awarded ${result.newBadges.length} new badges!`);
 * }
 */
const updateBadges = async (childId, options = {}) => {
  const { silent = false, throwOnError = false } = options;
  
  if (!childId) {
    const error = new Error('Child ID is required to update badges');
    if (throwOnError) throw error;
    console.error('[BadgeCheck]', error.message);
    return { success: false, error: error.message, newBadges: [] };
  }

  try {
    // Get current badges before checking
    const statsBefore = await ChildStats.getOrCreate(childId);
    const badgesBefore = statsBefore.badges.map(b => b.toString());

    // Check all badges
    await checkAllBadges(childId);

    // Get updated badges after checking
    const statsAfter = await ChildStats.findById(statsBefore._id).populate('badges', 'name category rarity');
    const badgesAfter = statsAfter.badges.map(b => b.toString());

    // Find newly awarded badges
    const newBadgeIds = badgesAfter.filter(id => !badgesBefore.includes(id));
    const newBadges = statsAfter.badges.filter(badge => newBadgeIds.includes(badge._id.toString()));

    if (!silent && newBadges.length > 0) {
      console.log(`[BadgeCheck] ✅ Awarded ${newBadges.length} new badge(s) to child ${childId}:`);
      newBadges.forEach(badge => {
        console.log(`  - ${badge.name} (${badge.category}, ${badge.rarity})`);
      });
    }

    return {
      success: true,
      newBadges: newBadges.map(badge => ({
        id: badge._id,
        name: badge.name,
        category: badge.category,
        rarity: badge.rarity,
      })),
      totalBadges: statsAfter.totalBadges,
    };
  } catch (error) {
    const errorMessage = `Error updating badges for child ${childId}: ${error.message}`;
    
    if (throwOnError) {
      throw new Error(errorMessage);
    }
    
    console.error(`[BadgeCheck] ${errorMessage}`, error);
    return {
      success: false,
      error: errorMessage,
      newBadges: [],
    };
  }
};

module.exports = {
  // Main reusable function - use this one!
  updateBadges,
  
  // Internal functions (exposed for advanced use cases)
  checkAllBadges,
  checkLevelBadges,
  checkMilestoneBadges,
  checkContentTypeBadges,
  checkStreakBadges,
  checkCompletionBadges,
  getStarsFromContentType,
};
