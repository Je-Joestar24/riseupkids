const mongoose = require('mongoose');

/**
 * AudioAssignmentProgress Model
 * 
 * Tracks child's progress on audio assignments
 * Stores the recorded audio submission
 */
const audioAssignmentProgressSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      required: [true, 'Progress must be associated with a child'],
      index: true,
    },
    audioAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AudioAssignment',
      required: [true, 'Progress must be associated with an audio assignment'],
      index: true,
    },
    // Status
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'submitted', 'approved', 'rejected'],
      default: 'not_started',
    },
    // Recorded audio submission
    recordedAudio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    // Stars earned
    starsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Time spent (in seconds)
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Start and completion timestamps
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    // Admin review fields
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminFeedback: {
      type: String,
      trim: true,
      maxlength: [1000, 'Feedback cannot exceed 1000 characters'],
      default: null,
    },
    // Number of attempts
    attempts: {
      type: Number,
      default: 0,
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
audioAssignmentProgressSchema.index({ child: 1, audioAssignment: 1 }, { unique: true });
audioAssignmentProgressSchema.index({ child: 1, status: 1 });
audioAssignmentProgressSchema.index({ audioAssignment: 1, status: 1 });
audioAssignmentProgressSchema.index({ reviewedBy: 1 });
audioAssignmentProgressSchema.index({ status: 1, reviewedAt: 1 });

// Pre-save hook to update timestamps
audioAssignmentProgressSchema.pre('save', function (next) {
  if (this.isNew && this.status === 'in_progress' && !this.startedAt) {
    this.startedAt = new Date();
  }
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  if (this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  if ((this.status === 'approved' || this.status === 'rejected') && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  if (this.status === 'in_progress' || this.status === 'completed' || this.status === 'submitted') {
    this.attempts += 1;
  }
  next();
});

// Post-save hook to award badge when audio assignment is approved/completed
audioAssignmentProgressSchema.post('save', async function (doc) {
  // Award badge when status is 'approved' or 'completed'
  if (doc.status === 'approved' || doc.status === 'completed') {
    try {
      const AudioAssignment = mongoose.model('AudioAssignment');
      const { awardBadgeForAudioAssignment } = require('../services/badgeAward.service');
      
      // Fetch audio assignment with badgeAwarded field
      const audioAssignment = await AudioAssignment.findById(doc.audioAssignment).select('badgeAwarded');
      
      if (audioAssignment && audioAssignment.badgeAwarded) {
        await awardBadgeForAudioAssignment(doc.child, audioAssignment);
      }
    } catch (error) {
      console.error('Error awarding badge for audio assignment completion:', error);
      // Don't throw - badge awarding is not critical
    }
  }
});

module.exports = mongoose.model('AudioAssignmentProgress', audioAssignmentProgressSchema);

