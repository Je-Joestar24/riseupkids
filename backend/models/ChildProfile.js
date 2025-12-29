const mongoose = require('mongoose');

const childProfileSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Child profile must have a parent'],
      index: true,
    },
    displayName: {
      type: String,
      required: [true, 'Please provide a display name'],
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [18, 'Age cannot exceed 18'],
    },
    avatar: {
      type: String, // File path for local storage, or URL for cloud
      default: null,
    },
    currentJourney: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Journey',
      default: null,
    },
    currentLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
    },
    preferences: {
      language: {
        type: String,
        default: 'en',
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light',
      },
      soundEnabled: {
        type: Boolean,
        default: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
childProfileSchema.index({ parent: 1 });
childProfileSchema.index({ currentJourney: 1 });
childProfileSchema.index({ currentLesson: 1 });

// Virtual for progress tracking
childProfileSchema.virtual('progress', {
  ref: 'Progress',
  localField: '_id',
  foreignField: 'child',
});

module.exports = mongoose.model('ChildProfile', childProfileSchema);

