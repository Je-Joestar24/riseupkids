const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      required: [true, 'Progress must be associated with a child'],
      index: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: function () {
        return !this.activity; // Required if not a standalone activity
      },
      index: true,
    },
    lessonItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LessonItem',
      default: null,
      index: true,
    },
    // For standalone activities (not in lessons)
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      default: null,
      index: true,
    },
    // Reference to activity group (if activity belongs to a group)
    activityGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActivityGroup',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started',
    },
    // Progress percentage (0-100)
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // Score (for quizzes, activities)
    score: {
      type: Number,
      default: null,
    },
    maxScore: {
      type: Number,
      default: null,
    },
    // Time spent (in seconds)
    timeSpent: {
      type: Number,
      default: 0,
    },
    // Start and completion timestamps
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Additional data (for activities, submissions, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Number of attempts
    attempts: {
      type: Number,
      default: 0,
    },
    // Stars earned for this progress item
    starsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Whether stars have been awarded (to prevent duplicate awards)
    starsAwarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient queries
progressSchema.index({ child: 1, lesson: 1 });
progressSchema.index({ child: 1, lessonItem: 1 });
progressSchema.index({ child: 1, activity: 1 });
progressSchema.index({ child: 1, activityGroup: 1 });
progressSchema.index({ child: 1, status: 1 });
progressSchema.index({ lesson: 1, status: 1 });
progressSchema.index({ activityGroup: 1, status: 1 });

// Pre-save hook to update timestamps
progressSchema.pre('save', function (next) {
  if (this.isNew && this.status === 'in_progress' && !this.startedAt) {
    this.startedAt = new Date();
  }
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  if (this.status === 'in_progress' || this.status === 'completed') {
    this.attempts += 1;
  }
  next();
});

module.exports = mongoose.model('Progress', progressSchema);

