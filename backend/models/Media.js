const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['image', 'video', 'audio'],
      required: [true, 'Please provide media type'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Local file storage path (for MVP)
    filePath: {
      type: String,
      required: [true, 'Please provide file path'],
    },
    // Future: Cloud storage URL (when migrating to Cloudinary/S3)
    cloudUrl: {
      type: String,
      default: null,
    },
    // Use filePath for MVP, cloudUrl for future
    // url is set automatically in pre-save hook
    url: {
      type: String,
      default: null,
    },
    mimeType: {
      type: String,
      required: [true, 'Please provide MIME type'],
    },
    size: {
      type: Number, // in bytes
      required: [true, 'Please provide file size'],
    },
    duration: {
      type: Number, // in seconds (for video/audio)
      default: null,
    },
    width: {
      type: Number, // for images/videos
      default: null,
    },
    height: {
      type: Number, // for images/videos
      default: null,
    },
    thumbnail: {
      type: String, // File path or URL for video thumbnails
      default: null,
    },
    // Stars awarded for watching (for videos)
    starsAwarded: {
      type: Number,
      default: 10,
      min: 0,
    },
    // SCORM file support for videos (Adobe SCORM file)
    // When type is 'video', this allows the video to have an associated SCORM file
    scormFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media', // SCORM file stored as separate Media record
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
    uploadedBy: {
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
mediaSchema.index({ type: 1 });
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ isActive: 1 });
mediaSchema.index({ scormFile: 1 });

// Pre-save hook to set url based on availability
mediaSchema.pre('save', function (next) {
  // Always set url - prefer cloudUrl if available, otherwise use filePath
  if (this.cloudUrl) {
    this.url = this.cloudUrl;
  } else if (this.filePath) {
    this.url = this.filePath;
  }
  next();
});

module.exports = mongoose.model('Media', mediaSchema);

