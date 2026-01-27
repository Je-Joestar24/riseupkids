const { google } = require('googleapis');
const googleOAuth = require('./googleOAuth.service');
const meetingService = require('./meeting.service');

/**
 * Google Meet Service
 * 
 * Handles Google Calendar API operations for creating/managing meetings
 * Requires authenticated Google account (OAuth) unless USE_GOOGLE_OAUTH=false
 */

/**
 * Check if OAuth is enabled
 * @returns {Boolean}
 */
const isOAuthEnabled = () => {
  return process.env.USE_GOOGLE_OAUTH !== 'false';
};

/**
 * Generate a valid-looking Google Meet link format (for testing)
 * Google Meet links follow pattern: abc-defg-hij (3 groups, lowercase alphanumeric)
 * Note: This is a mock link and won't actually work - it's for testing UI only
 */
const generateMockMeetCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const generateGroup = (length) => {
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };
  // Format: abc-defg-hij (3-4-3 pattern, common for Meet links)
  return `${generateGroup(3)}-${generateGroup(4)}-${generateGroup(3)}`;
};

/**
 * Create a mock/test meeting (when OAuth is disabled)
 * @param {Object} meetingData - Meeting details
 * @returns {Object} Mock meeting details
 */
const createMockMeeting = (meetingData) => {
  const { summary, description, startTime, endTime, timeZone } = meetingData;
  
  // Generate a mock event ID and Meet code
  const mockEventId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const mockMeetCode = generateMockMeetCode();
  // Generate a valid-looking Meet link format (but it's still a mock - won't work)
  const mockMeetLink = `https://meet.google.com/${mockMeetCode}`;
  
  return {
    eventId: mockEventId,
    meetLink: mockMeetLink,
    meetCode: mockMeetCode, // Store the code separately for display
    calendarLink: `https://calendar.google.com/event?eid=${mockEventId}`,
    startTime,
    endTime,
    timeZone,
    summary,
    description: description || '',
    isMock: true, // Flag to indicate this is a test/mock meeting
  };
};

/**
 * Create a Google Meet meeting
 * @param {String} userId - User's MongoDB ID
 * @param {Object} meetingData - Meeting details
 * @param {String} meetingData.summary - Meeting title
 * @param {String} meetingData.description - Meeting description (optional)
 * @param {Date|String} meetingData.startTime - Start time (ISO string or Date)
 * @param {Date|String} meetingData.endTime - End time (ISO string or Date)
 * @param {String} meetingData.timeZone - Timezone (e.g., 'America/New_York')
 * @param {Array<String>} meetingData.attendees - Email addresses (optional)
 * @returns {Object} Meeting details with Meet link
 * @throws {Error} If creation fails or OAuth required but not connected
 */
const createMeeting = async (userId, meetingData) => {
  const { summary, description, startTime, endTime, timeZone, attendees = [] } = meetingData;

  // Validate required fields
  if (!summary || !startTime || !endTime || !timeZone) {
    throw new Error('Missing required fields: summary, startTime, endTime, timeZone');
  }

  // If OAuth is disabled, return mock meeting
  if (!isOAuthEnabled()) {
    console.log('[GoogleMeet] OAuth disabled - creating mock meeting for testing');
    return createMockMeeting(meetingData);
  }

  // Check if user has Google integration
  const integration = await googleOAuth.getUserIntegration(userId);
  if (!integration.connected) {
    throw new Error('GOOGLE_OAUTH_REQUIRED'); // Special error code for frontend to trigger OAuth
  }

  // Get authenticated client
  const auth = await googleOAuth.getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // Convert to Date objects if strings
  const start = new Date(startTime);
  const end = new Date(endTime);

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }

  if (start >= end) {
    throw new Error('End time must be after start time');
  }

  // Generate unique request ID for conference
  const requestId = `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Prepare event data
  const event = {
    summary,
    description: description || '',
    start: {
      dateTime: start.toISOString(),
      timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone,
    },
    attendees: attendees.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
    conferenceDataVersion: 1,
  };

  try {
    // Create event with Meet link
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    const createdEvent = response.data;

    // Extract Meet link
    let meetLink = null;
    if (createdEvent.hangoutLink) {
      meetLink = createdEvent.hangoutLink;
    } else if (createdEvent.conferenceData?.entryPoints) {
      const meetEntry = createdEvent.conferenceData.entryPoints.find(
        (entry) => entry.entryPointType === 'video'
      );
      if (meetEntry) {
        meetLink = meetEntry.uri;
      }
    }

    if (!meetLink) {
      throw new Error('Failed to create Google Meet link');
    }

    const meetingResult = {
      eventId: createdEvent.id,
      meetLink,
      calendarLink: createdEvent.htmlLink,
      startTime: createdEvent.start.dateTime || createdEvent.start.date,
      endTime: createdEvent.end.dateTime || createdEvent.end.date,
      timeZone: createdEvent.start.timeZone || timeZone,
      summary: createdEvent.summary,
      description: createdEvent.description,
    };

    // Save meeting to database
    try {
      await meetingService.createMeeting(userId, {
        googleEventId: createdEvent.id,
        meetLink,
        calendarLink: createdEvent.htmlLink,
        title: createdEvent.summary,
        description: createdEvent.description || '',
        startTime: createdEvent.start.dateTime || createdEvent.start.date,
        endTime: createdEvent.end.dateTime || createdEvent.end.date,
        timeZone: createdEvent.start.timeZone || timeZone,
        attendees: createdEvent.attendees?.map((a) => a.email) || [],
        relatedCourse: meetingData.relatedCourse,
        relatedLesson: meetingData.relatedLesson,
        metadata: meetingData.metadata || {},
      });
    } catch (dbError) {
      console.error('[GoogleMeet] Error saving meeting to database:', dbError);
      // Don't fail the entire operation if DB save fails
      // The meeting is still created in Google Calendar
    }

    return meetingResult;
  } catch (error) {
    console.error('[GoogleMeet] Error creating meeting:', error);
    if (error.response) {
      throw new Error(
        `Failed to create meeting: ${error.response.data?.error?.message || error.message}`
      );
    }
    throw new Error(`Failed to create meeting: ${error.message}`);
  }
};

/**
 * Update a meeting
 * @param {String} userId - User's MongoDB ID
 * @param {String} eventId - Google Calendar event ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated meeting details
 * @throws {Error} If update fails
 */
const updateMeeting = async (userId, eventId, updates) => {
  // If OAuth is disabled and it's a mock meeting, return updated mock
  if (!isOAuthEnabled() && eventId.startsWith('mock-')) {
    console.log('[GoogleMeet] OAuth disabled - updating mock meeting');
    const mockMeeting = createMockMeeting({
      summary: updates.summary || 'Updated Meeting',
      description: updates.description,
      startTime: updates.startTime || new Date(),
      endTime: updates.endTime || new Date(Date.now() + 3600000),
      timeZone: updates.timeZone || 'UTC',
    });
    mockMeeting.eventId = eventId; // Keep original event ID
    return mockMeeting;
  }

  if (!isOAuthEnabled()) {
    throw new Error('Cannot update real meetings when OAuth is disabled');
  }

  const auth = await googleOAuth.getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // Get existing event first
  let existingEvent;
  try {
    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });
    existingEvent = response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Meeting not found');
    }
    throw new Error(`Failed to fetch meeting: ${error.message}`);
  }

  // Prepare updates
  const updatedEvent = { ...existingEvent };

  if (updates.summary !== undefined) {
    updatedEvent.summary = updates.summary;
  }

  if (updates.description !== undefined) {
    updatedEvent.description = updates.description;
  }

  if (updates.startTime || updates.endTime) {
    const timeZone = updates.timeZone || existingEvent.start.timeZone;

    if (updates.startTime) {
      const start = new Date(updates.startTime);
      if (isNaN(start.getTime())) {
        throw new Error('Invalid start time format');
      }
      updatedEvent.start = {
        dateTime: start.toISOString(),
        timeZone,
      };
    }

    if (updates.endTime) {
      const end = new Date(updates.endTime);
      if (isNaN(end.getTime())) {
        throw new Error('Invalid end time format');
      }
      updatedEvent.end = {
        dateTime: end.toISOString(),
        timeZone,
      };
    }

    // Validate dates
    const start = new Date(updatedEvent.start.dateTime || updatedEvent.start.date);
    const end = new Date(updatedEvent.end.dateTime || updatedEvent.end.date);
    if (start >= end) {
      throw new Error('End time must be after start time');
    }
  }

  if (updates.attendees !== undefined) {
    updatedEvent.attendees = updates.attendees.map((email) => ({ email }));
  }

  try {
    // Update event
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: updatedEvent,
    });

    const updated = response.data;

    // Extract Meet link (should remain the same)
    let meetLink = updated.hangoutLink;
    if (!meetLink && updated.conferenceData?.entryPoints) {
      const meetEntry = updated.conferenceData.entryPoints.find(
        (entry) => entry.entryPointType === 'video'
      );
      if (meetEntry) {
        meetLink = meetEntry.uri;
      }
    }

    const meetingResult = {
      eventId: updated.id,
      meetLink,
      calendarLink: updated.htmlLink,
      startTime: updated.start.dateTime || updated.start.date,
      endTime: updated.end.dateTime || updated.end.date,
      timeZone: updated.start.timeZone,
      summary: updated.summary,
      description: updated.description,
    };

    // Update meeting in database
    try {
      const dbMeeting = await meetingService.getMeetingByGoogleEventId(eventId);
      await meetingService.updateMeeting(dbMeeting._id.toString(), {
        title: updated.summary,
        description: updated.description || '',
        startTime: updated.start.dateTime || updated.start.date,
        endTime: updated.end.dateTime || updated.end.date,
        timeZone: updated.start.timeZone,
        attendees: updated.attendees?.map((a) => a.email) || [],
        calendarLink: updated.htmlLink,
      });
    } catch (dbError) {
      console.error('[GoogleMeet] Error updating meeting in database:', dbError);
      // Don't fail the entire operation if DB update fails
    }

    return meetingResult;
  } catch (error) {
    console.error('[GoogleMeet] Error updating meeting:', error);
    if (error.response) {
      throw new Error(
        `Failed to update meeting: ${error.response.data?.error?.message || error.message}`
      );
    }
    throw new Error(`Failed to update meeting: ${error.message}`);
  }
};

/**
 * Cancel/delete a meeting
 * @param {String} userId - User's MongoDB ID
 * @param {String} eventId - Google Calendar event ID
 * @returns {Boolean} Success
 * @throws {Error} If cancellation fails
 */
const cancelMeeting = async (userId, eventId) => {
  // If OAuth is disabled and it's a mock meeting, just return success
  if (!isOAuthEnabled() && eventId.startsWith('mock-')) {
    console.log('[GoogleMeet] OAuth disabled - cancelling mock meeting');
    return true;
  }

  if (!isOAuthEnabled()) {
    throw new Error('Cannot cancel real meetings when OAuth is disabled');
  }

  const auth = await googleOAuth.getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

    // Update meeting status in database
    try {
      const dbMeeting = await meetingService.getMeetingByGoogleEventId(eventId);
      await meetingService.cancelMeeting(dbMeeting._id.toString());
    } catch (dbError) {
      console.error('[GoogleMeet] Error updating meeting status in database:', dbError);
      // Don't fail the entire operation if DB update fails
    }

    return true;
  } catch (error) {
    console.error('[GoogleMeet] Error cancelling meeting:', error);
    if (error.response?.status === 404) {
      throw new Error('Meeting not found');
    }
    if (error.response) {
      throw new Error(
        `Failed to cancel meeting: ${error.response.data?.error?.message || error.message}`
      );
    }
    throw new Error(`Failed to cancel meeting: ${error.message}`);
  }
};

/**
 * Get meeting details
 * @param {String} userId - User's MongoDB ID
 * @param {String} eventId - Google Calendar event ID
 * @returns {Object} Meeting details
 * @throws {Error} If fetch fails
 */
const getMeeting = async (userId, eventId) => {
  // If OAuth is disabled and it's a mock meeting, return mock data
  if (!isOAuthEnabled() && eventId.startsWith('mock-')) {
    console.log('[GoogleMeet] OAuth disabled - returning mock meeting');
    return createMockMeeting({
      summary: 'Test Meeting',
      description: 'This is a test meeting (OAuth disabled)',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      timeZone: 'UTC',
    });
  }

  if (!isOAuthEnabled()) {
    throw new Error('Cannot fetch real meetings when OAuth is disabled');
  }

  const auth = await googleOAuth.getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    const event = response.data;

    // Extract Meet link
    let meetLink = event.hangoutLink;
    if (!meetLink && event.conferenceData?.entryPoints) {
      const meetEntry = event.conferenceData.entryPoints.find(
        (entry) => entry.entryPointType === 'video'
      );
      if (meetEntry) {
        meetLink = meetEntry.uri;
      }
    }

    return {
      eventId: event.id,
      meetLink,
      calendarLink: event.htmlLink,
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      timeZone: event.start.timeZone,
      summary: event.summary,
      description: event.description,
      attendees: event.attendees?.map((a) => a.email) || [],
      status: event.status,
    };
  } catch (error) {
    console.error('[GoogleMeet] Error fetching meeting:', error);
    if (error.response?.status === 404) {
      throw new Error('Meeting not found');
    }
    if (error.response) {
      throw new Error(
        `Failed to fetch meeting: ${error.response.data?.error?.message || error.message}`
      );
    }
    throw new Error(`Failed to fetch meeting: ${error.message}`);
  }
};

module.exports = {
  createMeeting,
  updateMeeting,
  cancelMeeting,
  getMeeting,
  isOAuthEnabled,
};
