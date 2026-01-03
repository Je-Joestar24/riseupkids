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
bookSchema.index({ createdBy: 1 });
bookSchema.index({ isPublished: 1 });
bookSchema.index({ language: 1 });
bookSchema.index({ readingLevel: 1 });

// Virtual for total pages
bookSchema.virtual('totalPages').get(function () {
  return this.pages ? this.pages.length : 0;
});

module.exports = mongoose.model('Book', bookSchema);

