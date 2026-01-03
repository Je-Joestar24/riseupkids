const mongoose = require('mongoose');

/**
 * StarEarning Model
 * 
 * Tracks individual star earnings for history and analytics
 * Helps track where stars came from
 */
const starEarningSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      required: [true, 'Star earning must be associated with a child'],
      index: true,
    },
    // Number of stars earned
    stars: {
      type: Number,
      required: [true, 'Please provide number of stars'],
      min: 1,
    },
    // Source of stars
    source: {
      type: {
        type: String,
        enum: [
          'lesson',
          'lesson_item',
          'activity',
          'video',
          'book',
          'audio_assignment',
          'explore_content',
          'kids_wall_post',
          'kids_wall_like',
          'badge',
          'streak',
          'milestone',
          'other',
        ],
        required: true,
      },
      // Reference to the source content
      contentId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      // Content type for dynamic reference
      contentType: {
        type: String,
        enum: ['Lesson', 'LessonItem', 'Activity', 'Media', 'Book', 'AudioAssignment', 'ExploreContent', 'KidsWallPost', 'Badge'],
        default: null,
      },
      // Additional source metadata
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    // Description/reason for earning stars
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
starEarningSchema.index({ child: 1, createdAt: -1 });
starEarningSchema.index({ 'source.type': 1, 'source.contentId': 1 });
starEarningSchema.index({ createdAt: -1 }); // For analytics

module.exports = mongoose.model('StarEarning', starEarningSchema);

