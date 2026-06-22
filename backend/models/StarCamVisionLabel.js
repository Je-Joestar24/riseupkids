const mongoose = require('mongoose');

const LABEL_SOURCES = ['oidv7', 'custom'];

const starCamVisionLabelSchema = new mongoose.Schema(
  {
    labelId: {
      type: String,
      trim: true,
      required: [true, 'labelId is required'],
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      required: [true, 'displayName is required'],
      maxlength: [200, 'displayName cannot exceed 200 characters'],
    },
    searchKey: {
      type: String,
      trim: true,
      required: [true, 'searchKey is required'],
      index: true,
    },
    source: {
      type: String,
      enum: LABEL_SOURCES,
      required: [true, 'source is required'],
      index: true,
    },
    isChildFriendly: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    defaultTerms: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

starCamVisionLabelSchema.index({ searchKey: 1, isActive: 1 });
starCamVisionLabelSchema.index({ source: 1, updatedAt: -1 });

module.exports = mongoose.model('StarCamVisionLabel', starCamVisionLabelSchema);
