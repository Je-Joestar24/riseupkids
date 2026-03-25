const mongoose = require('mongoose');

const programPrintableSchema = new mongoose.Schema(
  {
    // What this printable represents
    type: {
      type: String,
      enum: ['module', 'recipes', 'full_bundle'],
      required: true,
      index: true,
    },
    // For type === 'module'
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Printable title is required'],
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
      required: [true, 'Printable PDF URL is required'],
    },
    // Soft controls for admin: allow replacing old uploads without deleting
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

// Ensure module printables belong to a course
programPrintableSchema.pre('validate', function (next) {
  if (this.type === 'module' && !this.course) {
    return next(new Error('course is required when type is module'));
  }
  if (this.type !== 'module' && this.course) {
    // Allow but normalize to null to avoid accidental wrong linking
    this.course = null;
  }
  next();
});

// Note: we don't enforce a strict unique index for MVP, because we allow replacing
// files by deactivating previous records and creating a new one.
// The service will select the latest active record for a given (type, course).

module.exports = mongoose.model('ProgramPrintable', programPrintableSchema);

