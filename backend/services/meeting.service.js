const Meeting = require('../models/Meeting');

/**
 * Meeting Service
 * 
 * Handles database operations for Google Meet meetings
 * Includes CRUD, filtering, pagination, search, and archive functionality
 */

/**
 * Create a meeting in database
 * @param {String} userId - User's MongoDB ID
 * @param {Object} meetingData - Meeting details from Google Calendar
 * @param {String} meetingData.googleEventId - Google Calendar event ID
 * @param {String} meetingData.meetLink - Google Meet link
 * @param {String} meetingData.calendarLink - Google Calendar link
 * @param {String} meetingData.title - Meeting title
 * @param {String} meetingData.description - Meeting description
 * @param {Date|String} meetingData.startTime - Start time
 * @param {Date|String} meetingData.endTime - End time
 * @param {String} meetingData.timeZone - Timezone
 * @param {Array<String>} meetingData.attendees - Email addresses
 * @param {String} meetingData.relatedCourse - Course ID (optional)
 * @param {String} meetingData.relatedLesson - Lesson ID (optional)
 * @param {Object} meetingData.metadata - Additional metadata (optional)
 * @returns {Object} Created meeting
 */
const createMeeting = async (userId, meetingData) => {
  const {
    googleEventId,
    meetLink,
    calendarLink,
    title,
    description,
    startTime,
    endTime,
    timeZone,
    attendees = [],
    relatedCourse,
    relatedLesson,
    metadata = {},
  } = meetingData;

  // Check if meeting already exists (by googleEventId)
  const existingMeeting = await Meeting.findOne({ googleEventId });
  if (existingMeeting) {
    // Update existing meeting instead of creating duplicate
    existingMeeting.title = title;
    existingMeeting.description = description || '';
    existingMeeting.startTime = new Date(startTime);
    existingMeeting.endTime = new Date(endTime);
    existingMeeting.timeZone = timeZone;
    existingMeeting.attendees = attendees;
    existingMeeting.meetLink = meetLink;
    existingMeeting.calendarLink = calendarLink || existingMeeting.calendarLink;
    if (relatedCourse) existingMeeting.relatedCourse = relatedCourse;
    if (relatedLesson) existingMeeting.relatedLesson = relatedLesson;
    if (Object.keys(metadata).length > 0) {
      existingMeeting.metadata = new Map(Object.entries(metadata));
    }
    await existingMeeting.save();
    return existingMeeting;
  }

  // Create new meeting
  const meeting = await Meeting.create({
    createdBy: userId,
    googleEventId,
    meetLink,
    calendarLink,
    title,
    description: description || '',
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    timeZone,
    attendees,
    relatedCourse: relatedCourse || null,
    relatedLesson: relatedLesson || null,
    metadata: new Map(Object.entries(metadata)),
    status: 'scheduled',
    isArchived: false,
  });

  return meeting;
};

/**
 * Get all meetings with filters and pagination
 * @param {Object} filters - Filter parameters
 * @param {String} filters.createdBy - Filter by creator
 * @param {String} filters.status - Filter by status (scheduled, completed, cancelled)
 * @param {Boolean} filters.isArchived - Filter by archive status
 * @param {String} filters.search - Search in title/description
 * @param {Date|String} filters.startDate - Filter by start date (from)
 * @param {Date|String} filters.endDate - Filter by start date (to)
 * @param {String} filters.relatedCourse - Filter by course
 * @param {String} filters.relatedLesson - Filter by lesson
 * @param {Number} filters.page - Page number (default: 1)
 * @param {Number} filters.limit - Items per page (default: 10)
 * @param {String} filters.sortBy - Sort field (default: startTime)
 * @param {String} filters.sortOrder - Sort order (asc/desc, default: desc)
 * @returns {Object} Meetings with pagination info
 */
const getAllMeetings = async (filters = {}) => {
  const meetings = await Meeting.findWithFilters(filters);
  const total = await Meeting.countWithFilters(filters);

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 10;

  return {
    meetings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get meeting by ID
 * @param {String} meetingId - Meeting's MongoDB ID
 * @returns {Object} Meeting with populated data
 * @throws {Error} If meeting not found
 */
const getMeetingById = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId)
    .populate('createdBy', 'name email role')
    .populate('relatedCourse', 'title')
    .populate('relatedLesson', 'title')
    .lean();

  if (!meeting) {
    throw new Error('Meeting not found');
  }

  return meeting;
};

/**
 * Get meeting by Google Event ID
 * @param {String} googleEventId - Google Calendar event ID
 * @returns {Object} Meeting
 * @throws {Error} If meeting not found
 */
const getMeetingByGoogleEventId = async (googleEventId) => {
  const meeting = await Meeting.findOne({ googleEventId })
    .populate('createdBy', 'name email role')
    .populate('relatedCourse', 'title')
    .populate('relatedLesson', 'title')
    .lean();

  if (!meeting) {
    throw new Error('Meeting not found');
  }

  return meeting;
};

/**
 * Update meeting
 * @param {String} meetingId - Meeting's MongoDB ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated meeting
 * @throws {Error} If meeting not found
 */
const updateMeeting = async (meetingId, updates) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  // Update allowed fields
  if (updates.title !== undefined) meeting.title = updates.title;
  if (updates.description !== undefined) meeting.description = updates.description;
  if (updates.startTime !== undefined) meeting.startTime = new Date(updates.startTime);
  if (updates.endTime !== undefined) meeting.endTime = new Date(updates.endTime);
  if (updates.timeZone !== undefined) meeting.timeZone = updates.timeZone;
  if (updates.attendees !== undefined) meeting.attendees = updates.attendees;
  if (updates.status !== undefined) meeting.status = updates.status;
  if (updates.relatedCourse !== undefined) meeting.relatedCourse = updates.relatedCourse;
  if (updates.relatedLesson !== undefined) meeting.relatedLesson = updates.relatedLesson;
  if (updates.metadata !== undefined) {
    meeting.metadata = new Map(Object.entries(updates.metadata));
  }

  await meeting.save();
  return meeting;
};

/**
 * Archive meeting
 * @param {String} meetingId - Meeting's MongoDB ID
 * @returns {Object} Archived meeting
 * @throws {Error} If meeting not found
 */
const archiveMeeting = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  await meeting.archive();
  return meeting;
};

/**
 * Restore archived meeting
 * @param {String} meetingId - Meeting's MongoDB ID
 * @returns {Object} Restored meeting
 * @throws {Error} If meeting not found
 */
const restoreMeeting = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  await meeting.restore();
  return meeting;
};

/**
 * Cancel meeting
 * @param {String} meetingId - Meeting's MongoDB ID
 * @returns {Object} Cancelled meeting
 * @throws {Error} If meeting not found
 */
const cancelMeeting = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  await meeting.cancel();
  return meeting;
};

/**
 * Delete meeting permanently
 * @param {String} meetingId - Meeting's MongoDB ID
 * @returns {Boolean} Success
 * @throws {Error} If meeting not found
 */
const deleteMeeting = async (meetingId) => {
  const meeting = await Meeting.findByIdAndDelete(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }

  return true;
};

module.exports = {
  createMeeting,
  getAllMeetings,
  getMeetingById,
  getMeetingByGoogleEventId,
  updateMeeting,
  archiveMeeting,
  restoreMeeting,
  cancelMeeting,
  deleteMeeting,
};
