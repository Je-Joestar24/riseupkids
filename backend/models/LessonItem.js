const mongoose = require('mongoose');

const lessonItemSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson item must belong to a lesson'],
      index: true,
    },
    type: {
      type: String,
      enum: ['video', 'book', 'audio', 'activity', 'quiz', 'assignment', 'text', 'image'],
      required: [true, 'Please provide a lesson item type'],
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Reference to the actual content (Book, Media, Activity, etc.)
    contentRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return ['video', 'audio', 'image'].includes(this.type);
      },
      refPath: 'contentRefModel',
    },
    contentRefModel: {
      type: String,
      enum: ['Media', 'Book', 'Activity'],
      required: function () {
        return ['video', 'book', 'audio', 'activity', 'image'].includes(this.type);
      },
    },
    // For text content (no external reference needed)
    textContent: {
      type: String,
      default: null,
    },
    order: {
      type: Number,
      required: [true, 'Please provide item order'],
      default: 0,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    completionRule: {
      type: {
        type: String,
        enum: ['view', 'complete', 'score', 'time'],
        default: 'view',
      },
      minScore: {
        type: Number,
        default: null,
      },
      minTime: {
        type: Number, // in seconds
        default: null,
      },
    },
    estimatedDuration: {
      type: Number, // in minutes
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
lessonItemSchema.index({ lesson: 1, order: 1 });
lessonItemSchema.index({ type: 1 });

module.exports = mongoose.model('LessonItem', lessonItemSchema);

