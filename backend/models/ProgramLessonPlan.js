const mongoose = require('mongoose');

const programLessonPlanSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'course is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Lesson plan title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
    pdfUrl: {
      type: String,
      required: [true, 'Lesson plan PDF URL is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('ProgramLessonPlan', programLessonPlanSchema);
