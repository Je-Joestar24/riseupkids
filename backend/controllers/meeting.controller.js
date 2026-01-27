const meetingService = require('../services/meeting.service');

/**
 * Meeting Controller
 * 
 * Handles HTTP requests for meeting management (database operations)
 * All routes require authentication and teacher/admin role
 */

/**
 * @desc    Get all meetings with filters and pagination
 * @route   GET /api/meetings
 * @access  Private (Teacher/Admin only)
 * @query   createdBy, status, isArchived, search, startDate, endDate, relatedCourse, relatedLesson, page, limit, sortBy, sortOrder
 */
const getAllMeetings = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const {
      status,
      isArchived,
      search,
      startDate,
      endDate,
      relatedCourse,
      relatedLesson,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    // Build filters
    const filters = {
      createdBy: userId, // Only show meetings created by current user (unless admin)
      status,
      isArchived: isArchived === 'true' || isArchived === true,
      search,
      startDate,
      endDate,
      relatedCourse,
      relatedLesson,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      sortBy: sortBy || 'startTime',
      sortOrder: sortOrder || 'desc',
    };

    // Admins can see all meetings
    if (req.user.role === 'admin') {
      delete filters.createdBy;
      if (req.query.createdBy) {
        filters.createdBy = req.query.createdBy;
      }
    }

    const result = await meetingService.getAllMeetings(filters);

    res.status(200).json({
      success: true,
      message: 'Meetings retrieved successfully',
      data: result.meetings,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[Meeting] Error fetching meetings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch meetings',
    });
  }
};

/**
 * @desc    Get meeting by ID
 * @route   GET /api/meetings/:id
 * @access  Private (Teacher/Admin only)
 */
const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    const meeting = await meetingService.getMeetingById(id);

    // Check if user has permission (creator or admin)
    if (meeting.createdBy._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own meetings.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Meeting retrieved successfully',
      data: meeting,
    });
  } catch (error) {
    console.error('[Meeting] Error fetching meeting:', error);
    if (error.message === 'Meeting not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch meeting',
    });
  }
};

/**
 * @desc    Update meeting
 * @route   PATCH /api/meetings/:id
 * @access  Private (Teacher/Admin only)
 * @body    { title?, description?, startTime?, endTime?, timeZone?, attendees?, status?, relatedCourse?, relatedLesson?, metadata? }
 */
const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();
    const updates = req.body;

    // Get meeting first to check permissions
    const meeting = await meetingService.getMeetingById(id);

    // Check if user has permission (creator or admin)
    if (meeting.createdBy._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own meetings.',
      });
    }

    const updatedMeeting = await meetingService.updateMeeting(id, updates);

    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: updatedMeeting,
    });
  } catch (error) {
    console.error('[Meeting] Error updating meeting:', error);
    if (error.message === 'Meeting not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update meeting',
    });
  }
};

/**
 * @desc    Archive meeting
 * @route   POST /api/meetings/:id/archive
 * @access  Private (Teacher/Admin only)
 */
const archiveMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    // Get meeting first to check permissions
    const meeting = await meetingService.getMeetingById(id);

    // Check if user has permission (creator or admin)
    if (meeting.createdBy._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only archive your own meetings.',
      });
    }

    const archivedMeeting = await meetingService.archiveMeeting(id);

    res.status(200).json({
      success: true,
      message: 'Meeting archived successfully',
      data: archivedMeeting,
    });
  } catch (error) {
    console.error('[Meeting] Error archiving meeting:', error);
    if (error.message === 'Meeting not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to archive meeting',
    });
  }
};

/**
 * @desc    Restore archived meeting
 * @route   POST /api/meetings/:id/restore
 * @access  Private (Teacher/Admin only)
 */
const restoreMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    // Get meeting first to check permissions
    const meeting = await meetingService.getMeetingById(id);

    // Check if user has permission (creator or admin)
    if (meeting.createdBy._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only restore your own meetings.',
      });
    }

    const restoredMeeting = await meetingService.restoreMeeting(id);

    res.status(200).json({
      success: true,
      message: 'Meeting restored successfully',
      data: restoredMeeting,
    });
  } catch (error) {
    console.error('[Meeting] Error restoring meeting:', error);
    if (error.message === 'Meeting not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to restore meeting',
    });
  }
};

/**
 * @desc    Cancel meeting
 * @route   POST /api/meetings/:id/cancel
 * @access  Private (Teacher/Admin only)
 */
const cancelMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    // Get meeting first to check permissions
    const meeting = await meetingService.getMeetingById(id);

    // Check if user has permission (creator or admin)
    if (meeting.createdBy._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only cancel your own meetings.',
      });
    }

    const cancelledMeeting = await meetingService.cancelMeeting(id);

    res.status(200).json({
      success: true,
      message: 'Meeting cancelled successfully',
      data: cancelledMeeting,
    });
  } catch (error) {
    console.error('[Meeting] Error cancelling meeting:', error);
    if (error.message === 'Meeting not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel meeting',
    });
  }
};

/**
 * @desc    Delete meeting permanently
 * @route   DELETE /api/meetings/:id
 * @access  Private (Teacher/Admin only)
 */
const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    // Get meeting first to check permissions
    const meeting = await meetingService.getMeetingById(id);

    // Check if user has permission (creator or admin)
    if (meeting.createdBy._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own meetings.',
      });
    }

    await meetingService.deleteMeeting(id);

    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    console.error('[Meeting] Error deleting meeting:', error);
    if (error.message === 'Meeting not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete meeting',
    });
  }
};

module.exports = {
  getAllMeetings,
  getMeetingById,
  updateMeeting,
  archiveMeeting,
  restoreMeeting,
  cancelMeeting,
  deleteMeeting,
};
