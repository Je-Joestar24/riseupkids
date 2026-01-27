const mongoose = require('mongoose');

/**
 * Meeting Model
 * 
 * Stores Google Meet meetings created by teachers/admins
 * Links to Google Calendar events and provides local tracking
 */
const meetingSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
      index: true,
    },
    googleEventId: {
      type: String,
      required: [true, 'Google Event ID is required'],
      unique: true,
      index: true,
    },
    meetLink: {
      type: String,
      required: [true, 'Meet link is required'],
    },
    calendarLink: {
      type: String,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      index: true, // For text search
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      index: true,
    },
    timeZone: {
      type: String,
      required: [true, 'Timezone is required'],
      default: 'UTC',
    },
    attendees: [
      {
        type: String, // Email addresses
        trim: true,
        lowercase: true,
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    relatedLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
meetingSchema.index({ createdBy: 1, isArchived: 1, startTime: -1 });
meetingSchema.index({ status: 1, isArchived: 1 });
meetingSchema.index({ startTime: 1, endTime: 1 });
meetingSchema.index({ title: 'text', description: 'text' }); // Text search index

// Virtual: Check if meeting is upcoming
meetingSchema.virtual('isUpcoming').get(function () {
  return this.startTime > new Date() && this.status === 'scheduled';
});

// Virtual: Check if meeting is past
meetingSchema.virtual('isPast').get(function () {
  return this.endTime < new Date();
});

// Virtual: Check if meeting is ongoing
meetingSchema.virtual('isOngoing').get(function () {
  const now = new Date();
  return this.startTime <= now && this.endTime >= now && this.status === 'scheduled';
});

/**
 * Instance method: Archive meeting
 */
meetingSchema.methods.archive = function () {
  this.isArchived = true;
  return this.save();
};

/**
 * Instance method: Restore meeting
 */
meetingSchema.methods.restore = function () {
  this.isArchived = false;
  return this.save();
};

/**
 * Instance method: Cancel meeting
 */
meetingSchema.methods.cancel = function () {
  this.status = 'cancelled';
  return this.save();
};

/**
 * Instance method: Mark as completed
 */
meetingSchema.methods.complete = function () {
  this.status = 'completed';
  return this.save();
};

/**
 * Static method: Find meetings with filters and pagination
 */
meetingSchema.statics.findWithFilters = function (filters = {}, options = {}) {
  const {
    createdBy,
    status,
    isArchived,
    search,
    startDate,
    endDate,
    relatedCourse,
    relatedLesson,
    page = 1,
    limit = 10,
    sortBy = 'startTime',
    sortOrder = 'desc',
  } = filters;

  // Build query
  const query = {};

  if (createdBy) {
    query.createdBy = createdBy;
  }

  if (status !== undefined) {
    query.status = status;
  }

  if (isArchived !== undefined) {
    query.isArchived = isArchived === true || isArchived === 'true';
  }

  if (relatedCourse) {
    query.relatedCourse = relatedCourse;
  }

  if (relatedLesson) {
    query.relatedLesson = relatedLesson;
  }

  // Date range filter
  if (startDate || endDate) {
    query.startTime = {};
    if (startDate) {
      query.startTime.$gte = new Date(startDate);
    }
    if (endDate) {
      query.startTime.$lte = new Date(endDate);
    }
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Pagination
  const skip = (page - 1) * limit;

  return this.find(query)
    .populate('createdBy', 'name email role')
    .populate('relatedCourse', 'title')
    .populate('relatedLesson', 'title')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Static method: Count meetings with filters
 */
meetingSchema.statics.countWithFilters = function (filters = {}) {
  const {
    createdBy,
    status,
    isArchived,
    search,
    startDate,
    endDate,
    relatedCourse,
    relatedLesson,
  } = filters;

  const query = {};

  if (createdBy) {
    query.createdBy = createdBy;
  }

  if (status !== undefined) {
    query.status = status;
  }

  if (isArchived !== undefined) {
    query.isArchived = isArchived === true || isArchived === 'true';
  }

  if (relatedCourse) {
    query.relatedCourse = relatedCourse;
  }

  if (relatedLesson) {
    query.relatedLesson = relatedLesson;
  }

  if (startDate || endDate) {
    query.startTime = {};
    if (startDate) {
      query.startTime.$gte = new Date(startDate);
    }
    if (endDate) {
      query.startTime.$lte = new Date(endDate);
    }
  }

  if (search) {
    query.$text = { $search: search };
  }

  return this.countDocuments(query);
};

module.exports = mongoose.model('Meeting', meetingSchema);
