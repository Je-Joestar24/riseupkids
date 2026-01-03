const mongoose = require('mongoose');

/**
 * BookReading Model
 * 
 * Tracks individual book reading sessions
 * Books need to be read 5 times (SCORM-like activity requirement)
 */
const bookReadingSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      required: [true, 'Reading must be associated with a child'],
      index: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Reading must be associated with a book'],
      index: true,
    },
    // Reading session status
    status: {
      type: String,
      enum: ['started', 'in_progress', 'completed', 'abandoned'],
      default: 'started',
    },
    // Progress percentage (0-100)
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // Current page number
    currentPage: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Time spent reading (in seconds)
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Start and completion timestamps
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Stars earned for this reading session
    starsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Whether audio narration was used
    audioUsed: {
      type: Boolean,
      default: false,
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
bookReadingSchema.index({ child: 1, book: 1, createdAt: -1 });
bookReadingSchema.index({ child: 1, status: 1 });
bookReadingSchema.index({ book: 1, status: 1 });

// Pre-save hook to update completion timestamp
bookReadingSchema.pre('save', function (next) {
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

/**
 * Static method to get reading count for a child and book
 * @param {ObjectId} childId - Child profile ID
 * @param {ObjectId} bookId - Book ID
 * @returns {Promise<Number>} Number of completed readings
 */
bookReadingSchema.statics.getCompletedReadingCount = async function (childId, bookId) {
  return await this.countDocuments({
    child: childId,
    book: bookId,
    status: 'completed',
  });
};

/**
 * Static method to check if book requirement is met (5 readings)
 * @param {ObjectId} childId - Child profile ID
 * @param {ObjectId} bookId - Book ID
 * @returns {Promise<Boolean>} True if requirement is met
 */
bookReadingSchema.statics.isRequirementMet = async function (childId, bookId) {
  const count = await this.getCompletedReadingCount(childId, bookId);
  return count >= 5;
};

module.exports = mongoose.model('BookReading', bookReadingSchema);

