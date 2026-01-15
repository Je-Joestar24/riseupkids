const mongoose = require('mongoose');

/**
 * ExploreContent Model
 * 
 * Content available in the Explore page
 * Videos and lessons that can be accessed outside of journeys
 */
const exploreContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    // Content type
    type: {
      type: String,
      enum: ['video', 'lesson', 'activity', 'activity_group', 'book', 'audio'],
      required: [true, 'Please provide content type'],
    },
    // Reference to the actual content
    contentRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Please provide content reference'],
      refPath: 'contentRefModel',
    },
    contentRefModel: {
      type: String,
      enum: ['Media', 'Lesson', 'Activity', 'ActivityGroup', 'Book', 'AudioAssignment'],
      required: true,
    },
    // Cover image
    coverImage: {
      type: String, // File path or URL
      default: null,
    },
    // Video subtype for Explore content (only applies when type is 'video')
    videoType: {
      type: String,
      enum: ['replay', 'activity'],
      default: 'replay',
    },
    // SVG icon for activity-type videos (file path for uploaded SVG)
    activityIcon: {
      type: String, // File path or URL for SVG icon
      default: null,
    },
    // Video file reference (for video type content)
    videoFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    // Video file path (for direct access)
    videoFilePath: {
      type: String,
      default: null,
    },
    // Video file URL (for serving)
    videoFileUrl: {
      type: String,
      default: null,
    },
    // Video duration in seconds
    duration: {
      type: Number,
      default: null,
    },
    // Category (e.g., "Arts & Crafts", "Cooking", "Music")
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
      index: true,
    },
    // Stars awarded for completion
    starsAwarded: {
      type: Number,
      default: 10,
      min: 0,
    },
    // Progress tracking (for lessons)
    totalItems: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Order for display
    order: {
      type: Number,
      default: 0,
    },
    // Featured content
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
exploreContentSchema.index({ type: 1, category: 1, order: 1 });
exploreContentSchema.index({ isPublished: 1, isFeatured: 1 });
exploreContentSchema.index({ createdBy: 1 });
exploreContentSchema.index({ category: 1 });
exploreContentSchema.index({ videoType: 1 });
exploreContentSchema.index({ type: 1, videoType: 1 });

module.exports = mongoose.model('ExploreContent', exploreContentSchema);

