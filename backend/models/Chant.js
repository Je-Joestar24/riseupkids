const mongoose = require('mongoose');

/**
 * Chant Model
 * 
 * Chant content type - similar to audio but with different type/name
 * Supports optional audio and SCORM files
 */
const chantSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a chant title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    instructions: {
      type: String,
      trim: true,
    },
    // Reference audio (optional - example/instruction audio)
    audio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    // SCORM file reference (optional - for SCORM-powered chants)
    scormFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    // SCORM file path (for direct access)
    scormFilePath: {
      type: String,
      default: null,
    },
    // SCORM file URL (for serving)
    scormFileUrl: {
      type: String,
      default: null,
    },
    // SCORM file metadata
    scormFileSize: {
      type: Number, // in bytes
      default: null,
    },
    // SCORM file MIME type
    scormFileMimeType: {
      type: String,
      default: null,
    },
    // Cover image
    coverImage: {
      type: String, // File path or URL
      default: null,
    },
    // Estimated duration (in minutes)
    estimatedDuration: {
      type: Number,
      default: null,
    },
    // Stars awarded for completion
    starsAwarded: {
      type: Number,
      default: 10,
      min: 0,
    },
    // Badge awarded for completion (optional)
    badgeAwarded: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge',
      default: null,
    },
    // Related lesson (if part of a lesson)
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
      index: true,
    },
    // Related journey (if part of a journey)
    journey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Journey',
      default: null,
      index: true,
    },
    // Order for display
    order: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
chantSchema.index({ createdBy: 1 });
chantSchema.index({ isPublished: 1 });
chantSchema.index({ lesson: 1, order: 1 });
chantSchema.index({ journey: 1, order: 1 });

module.exports = mongoose.model('Chant', chantSchema);
