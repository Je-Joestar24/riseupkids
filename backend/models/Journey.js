const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a journey title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    coverImage: {
      type: String, // File path or URL
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    unlockRules: {
      type: {
        requiresPreviousJourney: {
          type: Boolean,
          default: false,
        },
        requiredJourney: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Journey',
          default: null,
        },
        minAge: {
          type: Number,
          default: null,
        },
        maxAge: {
          type: Number,
          default: null,
        },
      },
      default: {},
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
journeySchema.index({ isPublished: 1, order: 1 });
journeySchema.index({ createdBy: 1 });

// Virtual for lessons in this journey
journeySchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'journey',
});

module.exports = mongoose.model('Journey', journeySchema);

