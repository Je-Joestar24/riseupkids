/**
 * Badge Icons Mapping
 * 
 * Maps badge names to emoji icons for frontend display
 * Static badges use this mapping, custom badges can have icon/image in database
 */

export const BADGE_ICONS = {
  // Level Badges
  'First Star': '⭐',
  'Getting Started': '🌱',
  'Star Beginner': '⭐',
  'Rising Star': '✨',
  'Super Learner': '🌟',
  'Star Collector': '💫',
  'Diamond Level': '💎',
  'Champion': '🏆',
  'Mega Star': '⭐',

  // Content-Type Badges - Books
  'Book Lover': '📚',
  'Bookworm': '📖',
  'Reading Master': '📕',

  // Content-Type Badges - Music
  'Music Star': '🎵',
  'Music Maestro': '🎶',
  'Rock Star': '🎸',

  // Streak Badges
  'Week Streak': '🔥',
  'Month Streak': '⚡',
  'Streak Master': '💥',

  // Completion Badges
  'First Activity': '✅',
  'Activity Enthusiast': '🎯',
  'Completion Master': '🏅',
};

/**
 * Get badge icon
 * Priority: 1) badge.icon (from DB), 2) badge.image (from DB), 3) mapping by name
 * 
 * @param {Object} badge - Badge object from API
 * @returns {String} Icon (emoji or image URL)
 */
export const getBadgeIcon = (badge) => {
  if (!badge) return '🏆'; // Default icon

  // Check if badge has icon/image from database (for custom badges)
  if (badge.icon) return badge.icon;
  if (badge.image) return badge.image;

  // Fallback to mapping by name (for static badges)
  return BADGE_ICONS[badge.name] || '🏆';
};

export default BADGE_ICONS;
