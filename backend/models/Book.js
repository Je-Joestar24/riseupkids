const mongoose = require('mongoose');

// Schema for book pages
const pageSchema = new mongoose.Schema({
  pageNumber: {
    type: Number,
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String, // File path or URL
    default: null,
  },
});

// Schema for subtitle timestamps
const subtitleSchema = new mongoose.Schema({
  startTime: {
    type: Number, // in seconds
    required: true,
  },
  endTime: {
    type: Number, // in seconds
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
});

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a book title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    coverImage: {
      type: String, // File path or URL
      default: null,
    },
    // Package type: admin chooses on upload (radio). One book = SCORM or HTML5, not both.
    packageType: {
      type: String,
      enum: ['scorm', 'html5'],
      default: 'scorm',
    },
    // SCORM file reference (required when packageType === 'scorm')
    scormFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    scormFilePath: {
      type: String,
      default: null,
    },
    scormFileUrl: {
      type: String,
      default: null,
    },
    scormFileSize: {
      type: Number,
      default: null,
    },
    // HTML5 package (required when packageType === 'html5'). id from html5handler upload.
    html5PackageId: {
      type: String,
      default: null,
      trim: true,
    },
    html5EntryPoint: {
      type: String,
      default: 'index.html',
      trim: true,
    },
    // Pages array (optional - kept for backward compatibility, but SCORM file is primary)
    pages: [pageSchema],
    // Audio narration (read-along feature)
    audio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    // Transcript text (for read-along)
    transcriptText: {
      type: String,
      default: null,
      trim: true,
    },
    // Subtitles with timestamps (for read-along sync)
    subtitles: [subtitleSchema],
    // Language support
    language: {
      type: String,
      default: 'en',
    },
    // Reading level
    readingLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    // Estimated reading time (in minutes)
    estimatedReadingTime: {
      type: Number,
      default: null,
    },
    // Required reading count (SCORM-like activity - default 5 times)
    requiredReadingCount: {
      type: Number,
      default: 5,
      min: 1,
    },
    // Stars awarded per reading
    starsPerReading: {
      type: Number,
      default: 10,
      min: 0,
    },
    // Total stars awarded when requirement is met (5 readings)
    totalStarsAwarded: {
      type: Number,
      default: 50,
      min: 0,
    },
    // Badge awarded for completion (when requirement is met - 5 readings)
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

// Validate: one package type per book (SCORM or HTML5; chosen by admin via radio)
bookSchema.pre('validate', function (next) {
  const type = this.packageType || 'scorm';
  if (type === 'scorm') {
    if (!this.scormFile || !this.scormFilePath || !this.scormFileUrl) {
      next(new Error('SCORM package requires scormFile, scormFilePath, and scormFileUrl'));
      return;
    }
  } else if (type === 'html5') {
    if (!this.html5PackageId || !this.html5PackageId.trim()) {
      next(new Error('HTML5 package requires html5PackageId'));
      return;
    }
  }
  next();
});

// Indexes
bookSchema.index({ createdBy: 1 });
bookSchema.index({ isPublished: 1 });
bookSchema.index({ language: 1 });
bookSchema.index({ readingLevel: 1 });
bookSchema.index({ scormFile: 1 });
bookSchema.index({ packageType: 1 });
bookSchema.index({ badgeAwarded: 1 });

// Virtual for total pages
bookSchema.virtual('totalPages').get(function () {
  return this.pages ? this.pages.length : 0;
});

module.exports = mongoose.model('Book', bookSchema);

