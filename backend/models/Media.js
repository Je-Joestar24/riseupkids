const mongoose = require('mongoose');
const path = require('path');

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
    // Optional badge awarded for completing this media (primarily for videos)
    badgeAwarded: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge',
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
    // Published status (for videos and other content types)
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
mediaSchema.index({ type: 1 });
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ isActive: 1 });
mediaSchema.index({ isPublished: 1 });
mediaSchema.index({ scormFile: 1 });
mediaSchema.index({ badgeAwarded: 1 });

// Pre-save hook to set url based on availability
mediaSchema.pre('save', function (next) {
  // Always set url - prefer cloudUrl if available
  // If url is already set (from service), use it
  // Otherwise, if filePath is a relative path (starts with /uploads), use it
  // Otherwise, convert full filePath to relative path
  if (this.cloudUrl) {
    this.url = this.cloudUrl;
  } else if (!this.url && this.filePath) {
    // If filePath already starts with /uploads, it's already relative
    if (this.filePath.startsWith('/uploads')) {
      this.url = this.filePath;
    } else {
      // Convert full path to relative path
      // filePath format: D:\UPWORK\RiseUpKids\backend\uploads\media\videos\file.mp4
      // We need: /uploads/media/videos/file.mp4
      const uploadsIndex = this.filePath.indexOf('uploads');
      if (uploadsIndex !== -1) {
        const relativePath = this.filePath.substring(uploadsIndex + 'uploads'.length).replace(/\\/g, '/');
        this.url = `/uploads${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
      } else {
        // Fallback: use filePath as-is
        this.url = this.filePath;
      }
    }
  }
  next();
});

module.exports = mongoose.model('Media', mediaSchema);

