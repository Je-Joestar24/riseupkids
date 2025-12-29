const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a lesson title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    order: {
      type: Number,
      required: [true, 'Please provide lesson order'],
      default: 0,
    },
    journey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Journey',
      default: null,
      index: true,
    },
    coverImage: {
      type: String, // File path or URL
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    unlockRules: {
      type: {
        requiresPreviousLesson: {
          type: Boolean,
          default: false,
        },
        requiredLesson: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Lesson',
          default: null,
        },
        minProgress: {
          type: Number, // Percentage of previous lesson
          default: null,
        },
      },
      default: {},
    },
    estimatedDuration: {
      type: Number, // in minutes
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
lessonSchema.index({ journey: 1, order: 1 });
lessonSchema.index({ isPublished: 1 });
lessonSchema.index({ createdBy: 1 });

// Virtual for lesson items
lessonSchema.virtual('lessonItems', {
  ref: 'LessonItem',
  localField: '_id',
  foreignField: 'lesson',
});

module.exports = mongoose.model('Lesson', lessonSchema);

