const mongoose = require('mongoose');

const STAR_CAM_EVENT_TYPES = ['ispy_round_started', 'ispy_target_found', 'ispy_game_completed'];
const STAR_CAM_MODES = ['single_target', 'three_item', 'category', 'color'];

const starCamEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      enum: STAR_CAM_EVENT_TYPES,
      index: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent user is required'],
      index: true,
    },
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      required: [true, 'Child is required'],
      index: true,
    },
    mode: {
      type: String,
      enum: STAR_CAM_MODES,
      default: 'single_target',
      index: true,
    },
    levelId: {
      type: String,
      trim: true,
      default: null,
    },
    gameId: {
      type: String,
      trim: true,
      default: null,
    },
    roundId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    targetWord: {
      type: String,
      trim: true,
      required: function requiredTargetWord() {
        return this.event === 'ispy_round_started' || this.event === 'ispy_target_found';
      },
    },
    recognizedWord: {
      type: String,
      trim: true,
      default: null,
    },
    targets: {
      type: [String],
      default: undefined,
      validate: {
        validator(value) {
          if (this.event !== 'ispy_game_completed') return true;
          return Array.isArray(value) && value.length > 0;
        },
        message: 'Targets are required for ispy_game_completed event',
      },
    },
    attempts: {
      type: Number,
      min: 1,
      default: null,
    },
    durationSeconds: {
      type: Number,
      min: 0,
      default: null,
    },
    hintUsed: {
      type: Boolean,
      default: false,
    },
    devicePerformanceTier: {
      type: String,
      trim: true,
      default: null,
    },
    happenedAt: {
      type: Date,
      required: [true, 'Event timestamp is required'],
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

starCamEventSchema.index({ child: 1, event: 1, happenedAt: -1 });
starCamEventSchema.index({ parent: 1, happenedAt: -1 });

module.exports = mongoose.model('StarCamEvent', starCamEventSchema);
