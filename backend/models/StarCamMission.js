const mongoose = require('mongoose');

const STAR_CAM_MISSION_STATUS = ['draft', 'published', 'archived'];

function isPublishingRequired() {
  return this.status === 'published';
}

const missionVocabSchema = new mongoose.Schema(
  {
    // Backward-compatible legacy field
    word: { type: String, trim: true, required: false },
    // Display text shown to child
    displayText: { type: String, trim: true, required: [isPublishingRequired, 'Vocab displayText is required'] },
    // Object label used for AI detection target mapping
    target: { type: String, trim: true, lowercase: true, required: [isPublishingRequired, 'Vocab target is required'] },
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: [isPublishingRequired, 'Vocab image is required'] },
    audio: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: [isPublishingRequired, 'Vocab audio is required'] },
    introAudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    tryAgainAudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: [isPublishingRequired, 'Vocab tryAgainAudio is required'] },
    successAudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: [isPublishingRequired, 'Vocab successAudio is required'] },
    sortOrder: { type: Number, min: 0, max: 6, required: true },
  },
  { _id: false }
);

const missionItemSchema = new mongoose.Schema(
  {
    target: { type: String, trim: true, required: [isPublishingRequired, 'Item target is required'] },
    prompt: { type: String, trim: true, required: [isPublishingRequired, 'Item prompt is required'] },
    success: { type: String, trim: true, required: [isPublishingRequired, 'Item success message is required'] },
    fail: { type: String, trim: true, required: [isPublishingRequired, 'Item fail message is required'] },
    sortOrder: { type: Number, min: 0, max: 6, required: true },
  },
  { _id: false }
);

const starCamMissionSchema = new mongoose.Schema(
  {
    missionId: {
      type: String,
      trim: true,
      required: [true, 'missionId is required'],
      maxlength: [80, 'missionId cannot exceed 80 characters'],
      match: [/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'missionId must be lowercase with underscores (e.g. nature_01)'],
      index: true,
      unique: true,
    },
    title: {
      type: String,
      trim: true,
      required: [true, 'Mission title is required'],
      maxlength: [120, 'Mission title cannot exceed 120 characters'],
    },
    status: {
      type: String,
      enum: STAR_CAM_MISSION_STATUS,
      default: 'draft',
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StarCamCategory',
      required: [isPublishingRequired, 'Mission category is required'],
      index: true,
      default: null,
    },

    introText: {
      type: String,
      trim: true,
      required: [isPublishingRequired, 'Intro text is required'],
      maxlength: [500, 'Intro text cannot exceed 500 characters'],
    },
    missionImage: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    introImage: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: [isPublishingRequired, 'Intro image is required'] },

    videoEnabled: { type: Boolean, default: false },
    introVideo: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    missionShortVideo: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: [isPublishingRequired, 'Mission short video is required'] },

    vocab: {
      type: [missionVocabSchema],
      default: [],
      validate: {
        validator(value) {
          // Allow drafts to be incomplete; publishing checks happen elsewhere.
          if (this.status !== 'published') return true;
          return Array.isArray(value) && value.length === 7;
        },
        message: 'Published missions must have exactly 7 vocabulary entries',
      },
    },
    items: {
      type: [missionItemSchema],
      default: [],
      validate: {
        validator(value) {
          if (this.status !== 'published') return true;
          return Array.isArray(value) && value.length === 7;
        },
        message: 'Published missions must have exactly 7 scavenger hunt items',
      },
    },

    rewardImage: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: [isPublishingRequired, 'Reward image is required'] },
    rewardAudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: [isPublishingRequired, 'Mission reward audio is required'] },
    rewardTitle: {
      type: String,
      trim: true,
      default: 'Mission Accomplished!',
      maxlength: [80, 'Reward title cannot exceed 80 characters'],
    },
    rewardSubtitle: {
      type: String,
      trim: true,
      default: 'Great job, Explorer!',
      maxlength: [120, 'Reward subtitle cannot exceed 120 characters'],
    },

    publishedAt: { type: Date, default: null, index: true },
    archivedAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

starCamMissionSchema.index({ status: 1, updatedAt: -1 });
starCamMissionSchema.index({ category: 1, status: 1, updatedAt: -1 });

starCamMissionSchema.pre('save', function setPublishedAt(next) {
  if (this.isModified('status')) {
    if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
    if (this.status !== 'published' && this.publishedAt) this.publishedAt = null;
    if (this.status === 'archived' && !this.archivedAt) this.archivedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('StarCamMission', starCamMissionSchema);

