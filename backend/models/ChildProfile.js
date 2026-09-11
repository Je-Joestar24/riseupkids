const mongoose = require('mongoose');

const childProfileSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Child profile must have a parent'],
      // index: true,
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
    // RUK-SEC-006: Kids Wall is opt-in. `kidsWallEnabled` only grants sharing when it is
    // explicitly `true` AND `kidsWallConsentAt` is set — both are written together by
    // services/kidsWallConsent.service.js in response to an explicit parent action. Never set
    // either field directly elsewhere (e.g. in createChild).
    kidsWallEnabled: {
      type: Boolean,
      default: false,
    },
    kidsWallConsentAt: {
      type: Date,
      default: null,
    },
    /** IP address recorded at the moment a parent last granted Kids Wall consent. */
    kidsWallConsentIp: {
      type: String,
      default: null,
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

// Virtual for child stats
childProfileSchema.virtual('stats', {
  ref: 'ChildStats',
  localField: '_id',
  foreignField: 'child',
  justOne: true,
});

module.exports = mongoose.model('ChildProfile', childProfileSchema);

