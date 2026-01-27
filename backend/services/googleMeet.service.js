const { google } = require('googleapis');
const googleOAuth = require('./googleOAuth.service');

/**
 * Google Meet Service
 * 
 * Handles Google Calendar API operations for creating/managing meetings
 * Requires authenticated Google account (OAuth)
 */

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
 * @throws {Error} If creation fails
 */
const createMeeting = async (userId, meetingData) => {
  const { summary, description, startTime, endTime, timeZone, attendees = [] } = meetingData;

  // Validate required fields
  if (!summary || !startTime || !endTime || !timeZone) {
    throw new Error('Missing required fields: summary, startTime, endTime, timeZone');
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

    return {
      eventId: createdEvent.id,
      meetLink,
      calendarLink: createdEvent.htmlLink,
      startTime: createdEvent.start.dateTime || createdEvent.start.date,
      endTime: createdEvent.end.dateTime || createdEvent.end.date,
      timeZone: createdEvent.start.timeZone || timeZone,
      summary: createdEvent.summary,
      description: createdEvent.description,
    };
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

    return {
      eventId: updated.id,
      meetLink,
      calendarLink: updated.htmlLink,
      startTime: updated.start.dateTime || updated.start.date,
      endTime: updated.end.dateTime || updated.end.date,
      timeZone: updated.start.timeZone,
      summary: updated.summary,
      description: updated.description,
    };
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
  const auth = await googleOAuth.getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

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
};
