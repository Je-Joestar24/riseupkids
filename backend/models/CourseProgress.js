const mongoose = require('mongoose');

/**
 * CourseProgress Model
 * 
 * Tracks child's progress on courses
 * - Tracks completion status per course per child
 * - Tracks progress percentage
 * - Tracks completion of individual content items within the course
 * - Handles locked/unlocked status based on prerequisites
 */
const courseProgressSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      required: [true, 'Progress must be associated with a child'],
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Progress must be associated with a course'],
      index: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'locked'],
      default: 'not_started',
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Track completion of individual content items within the course
    contentProgress: [
      {
        contentId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        contentType: {
          type: String,
          required: true,
          enum: ['activity', 'book', 'video', 'audioAssignment'],
        },
        step: {
          type: Number,
          required: true,
          min: 1,
        },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'completed'],
          default: 'not_started',
        },
        completedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    // Track which steps are completed
    completedSteps: [
      {
        step: {
          type: Number,
          required: true,
          min: 1,
        },
        completedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Current step the child is on (for tracking progress)
    currentStep: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index - one progress entry per child per course
courseProgressSchema.index({ child: 1, course: 1 }, { unique: true });

// Index for querying by status
courseProgressSchema.index({ child: 1, status: 1 });

// Index for querying completed courses
courseProgressSchema.index({ child: 1, completedAt: -1 });

/**
 * Update progress percentage based on content completion
 * Called when content items are completed
 * Note: This requires the course to be populated to get total content count
 */
courseProgressSchema.methods.updateProgressPercentage = function (course) {
  if (!course || !course.contents || course.contents.length === 0) {
    this.progressPercentage = 0;
    return;
  }

  const totalCount = course.contents.length;
  const completedCount = this.contentProgress.filter(
    (item) => item.status === 'completed'
  ).length;

  this.progressPercentage = Math.round((completedCount / totalCount) * 100);

  // Auto-update status based on progress
  if (this.progressPercentage === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  } else if (this.progressPercentage > 0 && this.status === 'not_started') {
    this.status = 'in_progress';
    if (!this.startedAt) {
      this.startedAt = new Date();
    }
  }
};

/**
 * Check if a step is completed (all content in that step is done)
 * @param {Number} step - Step number to check
 * @param {Object} course - Course document with contents
 * @returns {Boolean} True if step is completed
 */
courseProgressSchema.methods.isStepCompleted = function (step, course) {
  if (!course || !course.contents) {
    return false;
  }

  // Get all content items in this step
  const stepContents = course.contents.filter((item) => item.step === step);
  if (stepContents.length === 0) {
    return true; // No content in step, consider it completed
  }

  // Check if all content in this step is completed
  return stepContents.every((content) => {
    const progressItem = this.contentProgress.find(
      (p) =>
        p.contentId.toString() === content.contentId.toString() &&
        p.contentType === content.contentType &&
        p.step === step
    );
    return progressItem && progressItem.status === 'completed';
  });
};

/**
 * Mark a step as completed
 */
courseProgressSchema.methods.markStepCompleted = function (step) {
  const existingStep = this.completedSteps.find((s) => s.step === step);
  if (!existingStep) {
    this.completedSteps.push({
      step,
      completedAt: new Date(),
    });
  }
};

/**
 * Mark a content item as completed
 * @param {String} contentId - Content item ID
 * @param {String} contentType - Content type
 * @param {Number} step - Step number this content belongs to
 * @param {Object} course - Course document (optional, for progress calculation)
 */
courseProgressSchema.methods.markContentCompleted = function (contentId, contentType, step, course = null) {
  const contentItem = this.contentProgress.find(
    (item) =>
      item.contentId.toString() === contentId.toString() &&
      item.contentType === contentType &&
      item.step === step
  );

  if (contentItem) {
    contentItem.status = 'completed';
    contentItem.completedAt = new Date();
  } else {
    // Add new content progress entry
    this.contentProgress.push({
      contentId,
      contentType,
      step,
      status: 'completed',
      completedAt: new Date(),
    });
  }

  // Update overall progress if course is provided
  if (course) {
    this.updateProgressPercentage(course);

    // Check if the step is now completed
    if (this.isStepCompleted(step, course)) {
      this.markStepCompleted(step);
      // Update current step to next step if available
      if (course.contents) {
        const maxStep = Math.max(...course.contents.map((c) => c.step));
        if (step < maxStep) {
          this.currentStep = step + 1;
        }
      }
    }
  }
};

module.exports = mongoose.model('CourseProgress', courseProgressSchema);

