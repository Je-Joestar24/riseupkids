const contactSupportService = require('../services/contactSupport.service');

/**
 * @desc    Create a new contact support message
 * @route   POST /api/contact-support
 * @access  Private (Parent only)
 */
const createContactMessage = async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    // Validate required fields
    if (!email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, subject, and message',
      });
    }

    // Validate subject enum
    const validSubjects = ['technical', 'billing', 'content', 'feature', 'other'];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject. Must be one of: technical, billing, content, feature, other',
      });
    }

    // Create contact message
    const contactMessage = await contactSupportService.createContactMessage(
      req.user._id,
      email,
      subject,
      message
    );

    res.status(201).json({
      success: true,
      data: contactMessage,
      message: 'Contact message submitted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit contact message',
    });
  }
};

/**
 * @desc    Get all contact messages (Admin only)
 * @route   GET /api/contact-support
 * @access  Private (Admin only)
 */
const getContactMessages = async (req, res) => {
  try {
    const { status, subject, priority, search, page, limit } = req.query;

    const filters = {
      status,
      subject,
      priority,
      search,
    };

    const pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    };

    const result = await contactSupportService.getContactMessages(filters, pagination);

    res.status(200).json({
      success: true,
      data: result.messages,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get contact messages',
    });
  }
};

/**
 * @desc    Get a single contact message by ID (Admin only)
 * @route   GET /api/contact-support/:id
 * @access  Private (Admin only)
 */
const getContactMessageById = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await contactSupportService.getContactMessageById(id);

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || 'Contact message not found',
    });
  }
};

/**
 * @desc    Get contact messages for the current user (Parent)
 * @route   GET /api/contact-support/my-messages
 * @access  Private (Parent only)
 */
const getMyContactMessages = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    };

    const result = await contactSupportService.getUserContactMessages(
      req.user._id,
      pagination
    );

    res.status(200).json({
      success: true,
      data: result.messages,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get your contact messages',
    });
  }
};

/**
 * @desc    Update contact message status (Admin only)
 * @route   PATCH /api/contact-support/:id/status
 * @access  Private (Admin only)
 */
const updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, in_progress, resolved, closed',
      });
    }

    const message = await contactSupportService.updateContactMessageStatus(
      id,
      status,
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: message,
      message: 'Message status updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update message status',
    });
  }
};

/**
 * @desc    Admin responds to a contact message
 * @route   POST /api/contact-support/:id/respond
 * @access  Private (Admin only)
 */
const respondToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    // Validate response
    if (!response || !response.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a response message',
      });
    }

    const message = await contactSupportService.respondToContactMessage(
      id,
      response,
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: message,
      message: 'Response sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send response',
    });
  }
};

module.exports = {
  createContactMessage,
  getContactMessages,
  getContactMessageById,
  getMyContactMessages,
  updateMessageStatus,
  respondToMessage,
};
