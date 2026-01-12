const mongoose = require('mongoose');

/**
 * KidsWallPost Model
 * 
 * Social media posts for children to share their work
 * Similar to a mini social media platform
 */
const kidsWallPostSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      required: [true, 'Post must be associated with a child'],
      index: true,
    },
    // Post type
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'mixed'],
      required: [true, 'Please provide post type'],
      default: 'text',
    },
    // Post content
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      trim: true,
      maxlength: [1000, 'Content cannot exceed 1000 characters'],
    },
    // Media attachments
    images: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    // Category/tag (e.g., "Math", "Art", "Reading")
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
      default: null,
    },
    // Related content (if post is about a specific lesson, activity, etc.)
    relatedContent: {
      type: {
        contentType: {
          type: String,
          enum: ['lesson', 'activity', 'book', 'video', 'audio', 'journey'],
        },
        contentId: {
          type: mongoose.Schema.Types.ObjectId,
        },
      },
      default: null,
    },
    // Engagement metrics
    likes: [
      {
        child: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ChildProfile',
        },
        likedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Comments (if needed in future)
    comments: [
      {
        child: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ChildProfile',
        },
        content: {
          type: String,
          required: true,
          trim: true,
          maxlength: [500, 'Comment cannot exceed 500 characters'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Moderation
    isApproved: {
      type: Boolean,
      default: true, // Posts are instantly approved (no pending status)
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
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
kidsWallPostSchema.index({ child: 1, createdAt: -1 });
kidsWallPostSchema.index({ isApproved: 1, isActive: 1, createdAt: -1 });
kidsWallPostSchema.index({ category: 1 });
kidsWallPostSchema.index({ 'relatedContent.contentType': 1, 'relatedContent.contentId': 1 });

// Virtual for like count
kidsWallPostSchema.virtual('likeCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
kidsWallPostSchema.virtual('commentCount').get(function () {
  return this.comments ? this.comments.length : 0;
});

module.exports = mongoose.model('KidsWallPost', kidsWallPostSchema);

