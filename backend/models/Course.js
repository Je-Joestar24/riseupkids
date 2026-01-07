const mongoose = require('mongoose');

/**
 * Course Model (Content Collection)
 * 
 * Similar to Google Classroom - a collection of mixed content types (Activities, Books, Videos, Audio)
 * - Can contain multiple content types in one course
 * - Contents can be reordered within the course
 * - Supports creating new content during course creation
 * - Supports adding existing content (unique only)
 */
const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a course title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    // Cover image for the course
    coverImage: {
      type: String, // File path or URL
      default: null,
    },
    // Course contents - array of content items with order
    contents: [
      {
        // Content item reference (can be Activity, Book, Video/Media, AudioAssignment)
        contentId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          // No ref because it can reference different models
        },
        // Content type: 'activity', 'book', 'video', 'audioAssignment'
        contentType: {
          type: String,
          required: true,
          enum: ['activity', 'book', 'video', 'audioAssignment'],
        },
        // Order within the course (for reordering)
        order: {
          type: Number,
          required: true,
          default: 0,
        },
        // When this content was added to the course
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Published status
    isPublished: {
      type: Boolean,
      default: false,
    },
    // Archive status (soft delete)
    isArchived: {
      type: Boolean,
      default: false,
    },
    // Tags for categorization
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    // Creator (admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient queries
courseSchema.index({ createdBy: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ isArchived: 1 });
courseSchema.index({ 'contents.contentId': 1, 'contents.contentType': 1 });
courseSchema.index({ title: 'text', description: 'text' }); // Text search

// Virtual: Get total content count
courseSchema.virtual('contentCount').get(function () {
  return this.contents ? this.contents.length : 0;
});

// Pre-save hook: Ensure unique content items and auto-sort by order
courseSchema.pre('save', function (next) {
  if (this.contents && this.contents.length > 0) {
    // Remove duplicates (same contentId + contentType)
    const seen = new Map();
    this.contents = this.contents.filter((item) => {
      const key = `${item.contentId}-${item.contentType}`;
      if (seen.has(key)) {
        return false; // Duplicate
      }
      seen.set(key, true);
      return true;
    });

    // Sort by order
    this.contents.sort((a, b) => a.order - b.order);

    // Reassign order values to be sequential (0, 1, 2, ...)
    this.contents.forEach((item, index) => {
      item.order = index;
    });
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);

