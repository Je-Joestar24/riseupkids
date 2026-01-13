const mongoose = require('mongoose');

/**
 * VideoWatch Model
 * 
 * Tracks how many times a child has watched a video
 * Only counts when video is finished (not just started)
 */
const videoWatchSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      required: [true, 'Video watch must be associated with a child'],
      index: true,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      required: [true, 'Video watch must be associated with a video'],
      index: true,
    },
    // Number of times the video has been watched (completed)
    watchCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Whether stars have been awarded for this video
    starsAwarded: {
      type: Boolean,
      default: false,
    },
    // Timestamp when stars were awarded
    starsAwardedAt: {
      type: Date,
      default: null,
    },
    // Array of watch timestamps (for history/analytics)
    watchHistory: [
      {
        watchedAt: {
          type: Date,
          default: Date.now,
        },
        // Optional: track watch duration or completion percentage
        completionPercentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 100, // Assume 100% if not specified
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index - one watch record per child per video
videoWatchSchema.index({ child: 1, video: 1 }, { unique: true });

// Index for querying by child
videoWatchSchema.index({ child: 1, watchCount: -1 });

// Index for querying by video
videoWatchSchema.index({ video: 1 });

module.exports = mongoose.model('VideoWatch', videoWatchSchema);
