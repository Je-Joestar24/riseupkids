const mongoose = require('mongoose');

/**
 * YouTubeLive Model
 *
 * Stores YouTube live streams created via the LMS so teachers/admins can
 * view their lives, copy keys, and manage (archive/delete). Title and
 * description are read-only from creation (no edit in LMS).
 */
const youtubeLiveSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
      index: true,
    },
    youtubeStreamId: {
      type: String,
      required: [true, 'YouTube stream ID is required'],
      unique: true,
      index: true,
    },
    youtubeBroadcastId: {
      type: String,
      required: [true, 'YouTube broadcast ID is required'],
      unique: true,
      index: true,
    },
    streamKey: {
      type: String,
      required: [true, 'Stream key is required'],
    },
    rtmpUrl: {
      type: String,
      required: [true, 'RTMP URL is required'],
    },
    watchUrl: {
      type: String,
      required: [true, 'Watch URL is required'],
    },
    embedUrl: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    coverImage: {
      type: String,
      default: null,
    },
    privacyStatus: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public',
    },
    scheduledStartTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      default: 'created',
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for list by user + filters + sort
youtubeLiveSchema.index({ createdBy: 1, isArchived: 1, createdAt: -1 });

/**
 * Static: find lives with filters and pagination (createdBy required)
 */
youtubeLiveSchema.statics.findWithFilters = function (filters = {}) {
  const {
    createdBy,
    isArchived,
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const query = {};

  if (createdBy) {
    query.createdBy = createdBy;
  }

  if (isArchived !== undefined && isArchived !== '') {
    query.isArchived = isArchived === true || isArchived === 'true';
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(term, 'i');
    query.$or = [
      { title: regex },
      { description: regex },
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  const skip = (page - 1) * limit;

  return this.find(query)
    .populate('createdBy', 'name email role')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Static: count lives with same filters (for pagination total)
 */
youtubeLiveSchema.statics.countWithFilters = function (filters = {}) {
  const { createdBy, isArchived, search } = filters;

  const query = {};

  if (createdBy) {
    query.createdBy = createdBy;
  }

  if (isArchived !== undefined && isArchived !== '') {
    query.isArchived = isArchived === true || isArchived === 'true';
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(term, 'i');
    query.$or = [
      { title: regex },
      { description: regex },
    ];
  }

  return this.countDocuments(query);
};

module.exports = mongoose.model('YouTubeLive', youtubeLiveSchema);
