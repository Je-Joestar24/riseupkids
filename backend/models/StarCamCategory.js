const mongoose = require('mongoose');

const starCamCategorySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      trim: true,
      required: [true, 'Category key is required'],
      unique: true,
      lowercase: true,
      maxlength: [50, 'Category key cannot exceed 50 characters'],
      match: [/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'Category key must be lowercase with underscores'],
      index: true,
    },
    name: {
      type: String,
      trim: true,
      required: [true, 'Category name is required'],
      maxlength: [80, 'Category name cannot exceed 80 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
      maxlength: [300, 'Category description cannot exceed 300 characters'],
    },
    targets: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

starCamCategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });

module.exports = mongoose.model('StarCamCategory', starCamCategorySchema);

