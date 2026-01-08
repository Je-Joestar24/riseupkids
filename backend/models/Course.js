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
    // Course contents - array of content items with step-based organization
    // Contents are organized into steps, and within each step, grouped by content type
    // Example: Step 1 (Books: Book A, Book B) -> Step 2 (Activities: Activity 1, Activity 2)
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
        // Step number (1, 2, 3, ...) - contents are organized into steps
        // Within each step, contents are grouped by type and must be completed sequentially
        step: {
          type: Number,
          required: true,
          default: 1,
          min: 1,
        },
        // Order within the step and content type (for reordering within same step and type)
        // Contents are sorted by: step -> contentType -> order
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
    // Course progression fields
    stepOrder: {
      type: Number,
      default: null, // null = no sequential requirement
      min: 1,
    },
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    isSequential: {
      type: Boolean,
      default: false, // If true, requires prerequisites to be completed
    },
    // Default course assignment fields
    isDefault: {
      type: Boolean,
      default: false, // If true, automatically assigned to new children
    },
    ageRange: {
      min: {
        type: Number,
        min: 0,
        max: 18,
        default: null,
      },
      max: {
        type: Number,
        min: 0,
        max: 18,
        default: null,
      },
    }, // Optional: assign based on child's age
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
courseSchema.index({ isDefault: 1 }); // For default course queries
courseSchema.index({ stepOrder: 1 }); // For sequential course ordering
courseSchema.index({ 'contents.contentId': 1, 'contents.contentType': 1 });
courseSchema.index({ title: 'text', description: 'text' }); // Text search

// Virtual: Get total content count
courseSchema.virtual('contentCount').get(function () {
  return this.contents ? this.contents.length : 0;
});

/**
 * Get contents organized by steps and content types
 * Returns: { step: 1, groups: { book: [...], activity: [...] } }
 */
courseSchema.methods.getContentsBySteps = function () {
  if (!this.contents || this.contents.length === 0) {
    return [];
  }

  const stepsMap = new Map();

  this.contents.forEach((content) => {
    const step = content.step || 1;

    if (!stepsMap.has(step)) {
      stepsMap.set(step, {
        step,
        groups: {
          book: [],
          activity: [],
          video: [],
          audioAssignment: [],
        },
      });
    }

    const stepData = stepsMap.get(step);
    if (stepData.groups[content.contentType]) {
      stepData.groups[content.contentType].push(content);
    }
  });

  // Convert map to array and sort by step
  const stepsArray = Array.from(stepsMap.values()).sort((a, b) => a.step - b.step);

  // Sort content within each group by order
  stepsArray.forEach((stepData) => {
    Object.keys(stepData.groups).forEach((contentType) => {
      stepData.groups[contentType].sort((a, b) => a.order - b.order);
    });
  });

  return stepsArray;
};

// Pre-save hook: Ensure unique content items and auto-sort by step -> contentType -> order
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

    // Sort by: step (ascending) -> contentType (alphabetical) -> order (ascending)
    this.contents.sort((a, b) => {
      // First by step
      if (a.step !== b.step) {
        return a.step - b.step;
      }
      // Then by contentType
      if (a.contentType !== b.contentType) {
        return a.contentType.localeCompare(b.contentType);
      }
      // Finally by order
      return a.order - b.order;
    });

    // Reassign order values to be sequential within each step and content type (0, 1, 2, ...)
    const stepTypeMap = new Map(); // Track order per step+type combination
    this.contents.forEach((item) => {
      const key = `${item.step}-${item.contentType}`;
      if (!stepTypeMap.has(key)) {
        stepTypeMap.set(key, 0);
      }
      item.order = stepTypeMap.get(key);
      stepTypeMap.set(key, stepTypeMap.get(key) + 1);
    });
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);

