const mongoose = require('mongoose');

/**
 * Lead Model
 *
 * Represents a sales-page invitation / lead captured before account creation.
 * This does NOT create a user account.
 */
const leadSchema = new mongoose.Schema(
  {
    parentName: {
      type: String,
      required: [true, 'parentName is required'],
      trim: true,
      maxlength: [150, 'parentName cannot exceed 150 characters'],
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    whatsapp: {
      type: String,
      required: [true, 'whatsapp is required'],
      trim: true,
    },
    age: {
      type: String,
      required: [true, 'age is required'],
      trim: true,
    },
    language: {
      type: String,
      enum: ['pt', 'en', 'es'],
      required: [true, 'language is required'],
    },
    consent: {
      type: Boolean,
      required: [true, 'consent is required'],
    },
    source: {
      type: String,
      default: 'sales-page',
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
    flodeskError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;

