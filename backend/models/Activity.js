const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an activity title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    // Cover image for the activity
    coverImage: {
      type: String, // File path or URL
      default: null,
    },
    // SCORM file reference (stored as Media)
    scormFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      required: [true, 'Please provide a SCORM file'],
    },
    // SCORM file path (for direct access)
    scormFilePath: {
      type: String,
      required: true,
    },
    // SCORM file URL (for serving)
    scormFileUrl: {
      type: String,
      required: true,
    },
    // SCORM file metadata
    scormFileSize: {
      type: Number, // in bytes
      required: true,
    },
    // Estimated completion time (in minutes)
    estimatedTime: {
      type: Number,
      default: null,
    },
    // Stars awarded for completion
    starsAwarded: {
      type: Number,
      default: 15,
      min: 0,
    },
    // Badge awarded for completion (optional)
    badgeAwarded: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isPublished: {
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

// Indexes
activitySchema.index({ createdBy: 1 });
activitySchema.index({ isPublished: 1 });
activitySchema.index({ scormFile: 1 });

module.exports = mongoose.model('Activity', activitySchema);

