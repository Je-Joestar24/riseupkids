const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an announcement title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Please provide announcement message'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    // Target audience
    targetAudience: {
      type: [
        {
          type: String,
          enum: ['all', 'parents', 'children', 'admins'],
        },
      ],
      default: ['all'],
    },
    // Priority level
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    // Media attachment (optional)
    attachment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    // Publish date
    publishDate: {
      type: Date,
      default: Date.now,
    },
    // Expiry date (optional)
    expiryDate: {
      type: Date,
      default: null,
    },
    // Is published
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Read tracking (optional - for future)
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
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
announcementSchema.index({ isPublished: 1, publishDate: -1 });
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ createdBy: 1 });
announcementSchema.index({ expiryDate: 1 });

// Virtual to check if announcement is active
announcementSchema.virtual('isActive').get(function () {
  const now = new Date();
  if (!this.isPublished) return false;
  if (this.publishDate && this.publishDate > now) return false;
  if (this.expiryDate && this.expiryDate < now) return false;
  return true;
});

module.exports = mongoose.model('Announcement', announcementSchema);

