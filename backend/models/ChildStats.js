const mongoose = require('mongoose');

/**
 * ChildStats Model
 * 
 * Tracks child's learning statistics: stars, streaks, and badges
 * One document per child profile
 */
const childStatsSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      required: [true, 'Stats must be associated with a child'],
      unique: true,
      index: true,
    },
    // Total stars earned (cumulative)
    totalStars: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Current day streak
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Longest streak achieved
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Last activity date (for streak calculation)
    lastActivityDate: {
      type: Date,
      default: null,
    },
    // Total badges earned
    totalBadges: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Badges earned (array of badge IDs)
    badges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Badge',
      },
    ],
    // Total activities completed
    totalActivitiesCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Total videos watched
    totalVideosWatched: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Total books read
    totalBooksRead: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Total audio assignments completed
    totalAudioAssignmentsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Total lessons completed
    totalLessonsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Total journeys completed
    totalJourneysCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
childStatsSchema.index({ child: 1 });
childStatsSchema.index({ totalStars: -1 }); // For leaderboards
childStatsSchema.index({ currentStreak: -1 }); // For streak leaderboards

/**
 * Method to add stars and update streak
 * @param {Number} stars - Number of stars to add
 * @returns {Promise} Updated stats
 */
childStatsSchema.methods.addStars = async function (stars) {
  if (stars > 0) {
    const previousTotal = this.totalStars || 0;
    this.totalStars = (this.totalStars || 0) + stars;
    
    // Ensure totalStars is a number
    if (typeof this.totalStars !== 'number' || isNaN(this.totalStars)) {
      console.error(`[ChildStats] Invalid totalStars value: ${this.totalStars}, resetting to ${previousTotal + stars}`);
      this.totalStars = previousTotal + stars;
    }
    
    await this.updateStreak();
    
    // Save with validation
    try {
      await this.save({ validateBeforeSave: true });
      console.log(`[ChildStats] Stars added successfully: ${previousTotal} + ${stars} = ${this.totalStars}`);
    } catch (error) {
      console.error(`[ChildStats] Error saving stars for child ${this.child}:`, error);
      throw error;
    }
  }
  return this;
};

/**
 * Method to update streak based on last activity
 * Call this when child completes any activity
 */
childStatsSchema.methods.updateStreak = async function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivity = this.lastActivityDate
    ? new Date(this.lastActivityDate)
    : null;
  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0);
  }

  const todayTime = today.getTime();
  const lastActivityTime = lastActivity ? lastActivity.getTime() : null;

  // If no previous activity or last activity was not today
  if (!lastActivityTime || lastActivityTime !== todayTime) {
    // Check if last activity was yesterday (streak continues)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();

    if (lastActivityTime === yesterdayTime) {
      // Continue streak
      this.currentStreak += 1;
    } else if (lastActivityTime < yesterdayTime) {
      // Streak broken, reset to 1
      this.currentStreak = 1;
    } else {
      // First activity ever
      this.currentStreak = 1;
    }

    // Update longest streak if needed
    if (this.currentStreak > this.longestStreak) {
      this.longestStreak = this.currentStreak;
    }

    // Update last activity date
    this.lastActivityDate = today;
  }
  // If activity was already today, don't update streak
};

/**
 * Method to add badge
 * @param {ObjectId} badgeId - Badge ID to add
 * @returns {Promise} Updated stats
 */
childStatsSchema.methods.addBadge = async function (badgeId) {
  if (!this.badges.includes(badgeId)) {
    this.badges.push(badgeId);
    this.totalBadges = this.badges.length;
    await this.save();
  }
  return this;
};

/**
 * Static method to get or create stats for a child
 * @param {ObjectId} childId - Child profile ID
 * @returns {Promise} ChildStats document
 */
childStatsSchema.statics.getOrCreate = async function (childId) {
  let stats = await this.findOne({ child: childId });
  if (!stats) {
    stats = await this.create({ child: childId });
  }
  return stats;
};

/**
 * Calculate current level based on total stars
 * Level thresholds must match level badge criteria
 * @returns {String} Current level name
 */
childStatsSchema.methods.calculateLevel = function () {
  const stars = this.totalStars || 0;

  // Level thresholds (must match level badge criteria)
  if (stars >= 2500) return 'Mega Star';
  if (stars >= 1000) return 'Champion';
  if (stars >= 500) return 'Diamond Level';
  if (stars >= 250) return 'Star Collector';
  if (stars >= 100) return 'Super Learner';
  if (stars >= 50) return 'Rising Star';
  if (stars >= 25) return 'Star Beginner';
  if (stars >= 10) return 'Getting Started';
  if (stars >= 1) return 'First Star';
  return 'New Learner';
};

/**
 * Get next level information
 * @returns {Object} { level: String, starsNeeded: Number }
 */
childStatsSchema.methods.getNextLevel = function () {
  const stars = this.totalStars || 0;
  const levelThresholds = [
    { level: 'First Star', stars: 1 },
    { level: 'Getting Started', stars: 10 },
    { level: 'Star Beginner', stars: 25 },
    { level: 'Rising Star', stars: 50 },
    { level: 'Super Learner', stars: 100 },
    { level: 'Star Collector', stars: 250 },
    { level: 'Diamond Level', stars: 500 },
    { level: 'Champion', stars: 1000 },
    { level: 'Mega Star', stars: 2500 },
  ];

  const currentLevel = this.calculateLevel();
  const currentIndex = levelThresholds.findIndex((l) => l.level === currentLevel);

  if (currentIndex === -1 || currentIndex === levelThresholds.length - 1) {
    return { level: null, starsNeeded: 0 }; // Max level reached
  }

  const nextLevel = levelThresholds[currentIndex + 1];
  return {
    level: nextLevel.level,
    starsNeeded: nextLevel.stars - stars,
  };
};

// Virtual for level (for display purposes)
childStatsSchema.virtual('level').get(function () {
  return this.calculateLevel();
});

module.exports = mongoose.model('ChildStats', childStatsSchema);

