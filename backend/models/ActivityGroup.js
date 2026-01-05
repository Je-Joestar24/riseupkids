const mongoose = require('mongoose');

/**
 * ActivityGroup Model
 * 
 * Groups multiple activities together with a title
 * Used in Explore section to organize activities by theme/category
 */
const activityGroupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a group title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    // Activities in this group
    activities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity',
        required: true,
      },
    ],
    // Cover image for the group
    coverImage: {
      type: String, // File path or URL
      default: null,
    },
    // Category (e.g., "Arts & Crafts", "Math", "Science")
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
      index: true,
    },
    // Order for display in explore section
    order: {
      type: Number,
      default: 0,
    },
    // Stars awarded for completing ALL activities in the group
    starsAwarded: {
      type: Number,
      default: 50, // Bonus for completing entire group
      min: 0,
    },
    // Badge awarded for completing entire group (optional)
    badgeAwarded: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge',
      default: null,
    },
    // Featured group
    isFeatured: {
      type: Boolean,
      default: false,
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
activityGroupSchema.index({ category: 1, order: 1 });
activityGroupSchema.index({ isPublished: 1, isFeatured: 1 });
activityGroupSchema.index({ createdBy: 1 });
activityGroupSchema.index({ 'activities': 1 });

// Virtual for activity count
activityGroupSchema.virtual('activityCount').get(function () {
  return this.activities ? this.activities.length : 0;
});

/**
 * Check if all activities in the group are completed for a child
 * @param {String} childId - Child profile ID
 * @returns {Promise<Object>} - { isComplete: boolean, completedCount: number, totalCount: number }
 */
activityGroupSchema.methods.checkCompletion = async function (childId) {
  const Progress = mongoose.model('Progress');
  
  if (!this.activities || this.activities.length === 0) {
    return { isComplete: false, completedCount: 0, totalCount: 0 };
  }

  const completedCount = await Progress.countDocuments({
    child: childId,
    activity: { $in: this.activities },
    activityGroup: this._id,
    status: 'completed',
  });

  const totalCount = this.activities.length;
  const isComplete = completedCount === totalCount;

  return {
    isComplete,
    completedCount,
    totalCount,
    progressPercentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
  };
};

/**
 * Static method to get group completion status
 * @param {String} groupId - ActivityGroup ID
 * @param {String} childId - Child profile ID
 * @returns {Promise<Object>}
 */
activityGroupSchema.statics.getCompletionStatus = async function (groupId, childId) {
  const group = await this.findById(groupId).populate('activities');
  if (!group) {
    throw new Error('ActivityGroup not found');
  }
  return await group.checkCompletion(childId);
};

module.exports = mongoose.model('ActivityGroup', activityGroupSchema);

