const mongoose = require('mongoose');

/**
 * School Prospect Model
 *
 * Sales-page school application captured before any institutional account is created.
 */
const schoolProspectSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: [true, 'schoolName is required'],
      trim: true,
      maxlength: [200, 'schoolName cannot exceed 200 characters'],
    },
    cityCountry: {
      type: String,
      required: [true, 'cityCountry is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'role is required'],
      enum: ['owner', 'principal', 'coordinator', 'teacher'],
    },
    whatsapp: {
      type: String,
      required: [true, 'whatsapp is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    studentCount: {
      type: String,
      required: [true, 'studentCount is required'],
      trim: true,
    },
    ageGroup: {
      type: String,
      required: [true, 'ageGroup is required'],
      trim: true,
    },
    currentEnglish: {
      type: String,
      required: [true, 'currentEnglish is required'],
      enum: ['yes', 'no'],
    },
    interest: {
      type: String,
      required: [true, 'interest is required'],
      trim: true,
    },
    language: {
      type: String,
      enum: ['pt', 'en', 'es'],
      required: [true, 'language is required'],
    },
    source: {
      type: String,
      default: 'sales-page-schools',
      trim: true,
    },
    flodeskStatus: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    flodeskSubscriberId: {
      type: String,
      default: null,
    },
    flodeskSegmentId: {
      type: String,
      default: null,
    },
    flodeskError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

schoolProspectSchema.index({ email: 1, createdAt: -1 });
schoolProspectSchema.index({ language: 1, createdAt: -1 });

const SchoolProspect = mongoose.model('SchoolProspect', schoolProspectSchema);

module.exports = SchoolProspect;
