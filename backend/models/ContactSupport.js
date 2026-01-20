const mongoose = require('mongoose');

/**
 * ContactSupport Model
 * 
 * Tracks contact support messages from parents
 * Admins can view, respond to, and manage these messages
 */
const contactSupportSchema = new mongoose.Schema(
  {
    // Email address of the parent submitting the message
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\S+@\S+\.\S+$/.test(v);
        },
        message: 'Please provide a valid email address',
      },
    },
    // Subject type
    subject: {
      type: String,
      required: [true, 'Please provide a subject'],
      enum: ['technical', 'billing', 'content', 'feature', 'other'],
      default: 'other',
    },
    // Message content
    message: {
      type: String,
      required: [true, 'Please provide a message'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    // Reference to the User (parent) who created the message
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Contact message must be associated with a user'],
      index: true,
    },
    // Status of the message
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'closed'],
      default: 'pending',
      index: true,
    },
    // Admin's response to the message
    adminResponse: {
      type: String,
      trim: true,
      maxlength: [2000, 'Admin response cannot exceed 2000 characters'],
      default: null,
    },
    // Admin user who responded
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Timestamp when admin responded
    respondedAt: {
      type: Date,
      default: null,
    },
    // Priority level
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
contactSupportSchema.index({ user: 1 });
contactSupportSchema.index({ status: 1 });
contactSupportSchema.index({ createdAt: -1 });
contactSupportSchema.index({ subject: 1, status: 1 });
contactSupportSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('ContactSupport', contactSupportSchema);
