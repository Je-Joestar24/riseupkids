const ChildStats = require('../models/ChildStats');
const Badge = require('../models/Badge');

/**
 * Badge Awarding Service
 * 
 * Utility service to award badges to children when they complete content
 * Awards 1 badge per completion (Activity, Book requirement met, Audio Assignment approved)
 */

/**
 * Award badge to a child
 * @param {String} childId - Child profile ID
 * @param {String} badgeId - Badge ID to award
 * @returns {Promise<Object>} Updated child stats
 */
const awardBadge = async (childId, badgeId) => {
  if (!badgeId) {
    return null; // No badge to award
  }

  // Verify badge exists
  const badge = await Badge.findById(badgeId);
  if (!badge) {
    console.warn(`Badge ${badgeId} not found, skipping badge award`);
    return null;
  }

  // Get or create child stats
  const stats = await ChildStats.getOrCreate(childId);

  // Award badge (addBadge method prevents duplicates)
  await stats.addBadge(badgeId);

  return stats;
};

/**
 * Award badge when activity is completed
 * @param {String} childId - Child profile ID
 * @param {Object} activity - Activity document with badgeAwarded field
 * @returns {Promise<Object|null>} Updated child stats or null
 */
const awardBadgeForActivity = async (childId, activity) => {
  if (!activity || !activity.badgeAwarded) {
    return null;
  }

  return await awardBadge(childId, activity.badgeAwarded);
};

/**
 * Award badge when book requirement is met (5 readings completed)
 * @param {String} childId - Child profile ID
 * @param {Object} book - Book document with badgeAwarded field
 * @returns {Promise<Object|null>} Updated child stats or null
 */
const awardBadgeForBook = async (childId, book) => {
  if (!book || !book.badgeAwarded) {
    return null;
  }

  return await awardBadge(childId, book.badgeAwarded);
};

/**
 * Award badge when audio assignment is approved/completed
 * @param {String} childId - Child profile ID
 * @param {Object} audioAssignment - AudioAssignment document with badgeAwarded field
 * @returns {Promise<Object|null>} Updated child stats or null
 */
const awardBadgeForAudioAssignment = async (childId, audioAssignment) => {
  if (!audioAssignment || !audioAssignment.badgeAwarded) {
    return null;
  }

  return await awardBadge(childId, audioAssignment.badgeAwarded);
};

module.exports = {
  awardBadge,
  awardBadgeForActivity,
  awardBadgeForBook,
  awardBadgeForAudioAssignment,
};

