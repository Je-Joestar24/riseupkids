const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an activity title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    instructions: {
      type: String,
      required: [true, 'Please provide activity instructions'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['drawing', 'quiz', 'task', 'puzzle', 'matching', 'writing', 'other'],
      required: [true, 'Please provide activity type'],
    },
    // Media associated with activity (images, videos, etc.)
    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    // For quiz activities
    questions: [
      {
        question: {
          type: String,
          required: true,
          trim: true,
        },
        options: [
          {
            type: String,
            trim: true,
          },
        ],
        correctAnswer: {
          type: Number, // Index of correct option
          required: function () {
            return this.parent().type === 'quiz';
          },
        },
        points: {
          type: Number,
          default: 1,
        },
      },
    ],
    // Auto-complete settings
    autoComplete: {
      type: Boolean,
      default: false,
    },
    // Scoring
    maxScore: {
      type: Number,
      default: null,
    },
    // Estimated completion time (in minutes)
    estimatedTime: {
      type: Number,
      default: null,
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
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
activitySchema.index({ createdBy: 1 });
activitySchema.index({ type: 1 });
activitySchema.index({ isPublished: 1 });

module.exports = mongoose.model('Activity', activitySchema);

