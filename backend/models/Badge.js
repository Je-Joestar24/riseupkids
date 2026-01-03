const mongoose = require('mongoose');

/**
 * Badge Model
 * 
 * Defines badges that children can earn
 * Badges are awarded for completing specific achievements
 */
const badgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a badge name'],
      trim: true,
      maxlength: [100, 'Badge name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    icon: {
      type: String, // Emoji or icon identifier (e.g., "🏆", "⭐", "🎯")
      default: '🏆',
    },
    image: {
      type: String, // File path or URL for badge image
      default: null,
    },
    category: {
      type: String,
      enum: [
        'streak',
        'completion',
        'milestone',
        'explore',
        'social',
        'special',
        'other',
      ],
      default: 'other',
    },
    // Criteria for earning this badge
    criteria: {
      type: {
        type: String,
        enum: [
          'streak_days',
          'total_stars',
          'activities_completed',
          'lessons_completed',
          'journeys_completed',
          'books_read',
          'videos_watched',
          'audio_assignments_completed',
          'kids_wall_posts',
          'kids_wall_likes',
          'custom',
        ],
        required: true,
      },
      value: {
        type: Number,
        required: true,
        min: 0,
      },
      // For custom criteria, additional metadata
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    // Badge rarity/level
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    // Order for display
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
badgeSchema.index({ category: 1, order: 1 });
badgeSchema.index({ isActive: 1 });
badgeSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Badge', badgeSchema);

