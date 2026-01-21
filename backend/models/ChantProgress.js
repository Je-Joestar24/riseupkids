const mongoose = require('mongoose');

/**
 * ChantProgress Model
 *
 * Tracks child's progress on chants.
 * Chants can include an instruction video and a child recorded audio response,
 * but (unlike AudioAssignments) do NOT require admin/teacher review.
 */
const chantProgressSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      required: [true, 'Progress must be associated with a child'],
      index: true,
    },
    chant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chant',
      required: [true, 'Progress must be associated with a chant'],
      index: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    // Child recorded audio submission (optional but expected for completion)
    recordedAudio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    starsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    starsAwarded: {
      type: Boolean,
      default: false,
    },
    starsAwardedAt: {
      type: Date,
      default: null,
    },
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
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

chantProgressSchema.index({ child: 1, chant: 1 }, { unique: true });
chantProgressSchema.index({ child: 1, status: 1 });
chantProgressSchema.index({ chant: 1, status: 1 });
chantProgressSchema.index({ status: 1, completedAt: 1 });

chantProgressSchema.pre('save', function (next) {
  // Timestamps
  if (this.isNew && this.status === 'in_progress' && !this.startedAt) {
    this.startedAt = new Date();
  }
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Attempts: increment when status transitions into in_progress/completed
  if (this.isModified('status') && (this.status === 'in_progress' || this.status === 'completed')) {
    this.attempts += 1;
  }

  next();
});

module.exports = mongoose.model('ChantProgress', chantProgressSchema);

