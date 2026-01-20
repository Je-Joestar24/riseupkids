const ContactSupport = require('../models/ContactSupport');
const User = require('../models/User');

/**
 * Create a new contact support message
 * 
 * @param {String} userId - User's MongoDB ID
 * @param {String} email - Email address
 * @param {String} subject - Subject type
 * @param {String} message - Message content
 * @returns {Object} Created contact support message
 */
const createContactMessage = async (userId, email, subject, message) => {
  // Verify user exists and is a parent
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (user.role !== 'parent') {
    throw new Error('Only parents can submit contact support messages');
  }

  // Create contact message
  const contactMessage = await ContactSupport.create({
    user: userId,
    email: email.toLowerCase().trim(),
    subject,
    message: message.trim(),
    status: 'pending',
    priority: 'normal',
  });

  return contactMessage;
};

/**
 * Get all contact messages with filtering and pagination (Admin only)
 * 
 * @param {Object} filters - Filter options (status, subject, priority, search)
 * @param {Object} pagination - Pagination options (page, limit)
 * @returns {Object} Paginated contact messages
 */
const getContactMessages = async (filters = {}, pagination = {}) => {
  const { status, subject, priority, search } = filters;
  const { page = 1, limit = 20 } = pagination;

  // Build query
  const query = {};

  if (status) {
    query.status = status;
  }

  if (subject) {
    query.subject = subject;
  }

  if (priority) {
    query.priority = priority;
  }

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } },
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get total count
  const total = await ContactSupport.countDocuments(query);

  // Get messages with pagination
  const messages = await ContactSupport.find(query)
    .populate('user', 'name email')
    .populate('respondedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  return {
    messages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single contact message by ID
 * 
 * @param {String} messageId - Contact message MongoDB ID
 * @returns {Object} Contact message
 */
const getContactMessageById = async (messageId) => {
  const message = await ContactSupport.findById(messageId)
    .populate('user', 'name email')
    .populate('respondedBy', 'name email')
    .lean();

  if (!message) {
    throw new Error('Contact message not found');
  }

  return message;
};

/**
 * Get contact messages for a specific parent user
 * 
 * @param {String} userId - User's MongoDB ID
 * @param {Object} pagination - Pagination options (page, limit)
 * @returns {Object} Paginated contact messages for the user
 */
const getUserContactMessages = async (userId, pagination = {}) => {
  const { page = 1, limit = 20 } = pagination;

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get total count
  const total = await ContactSupport.countDocuments({ user: userId });

  // Get messages with pagination
  const messages = await ContactSupport.find({ user: userId })
    .populate('respondedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  return {
    messages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update contact message status
 * 
 * @param {String} messageId - Contact message MongoDB ID
 * @param {String} status - New status
 * @param {String} adminId - Admin user ID who is updating
 * @returns {Object} Updated contact message
 */
const updateContactMessageStatus = async (messageId, status, adminId) => {
  // Verify admin exists
  const admin = await User.findById(adminId);
  if (!admin || admin.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  const message = await ContactSupport.findByIdAndUpdate(
    messageId,
    { status },
    { new: true, runValidators: true }
  )
    .populate('user', 'name email')
    .populate('respondedBy', 'name email')
    .lean();

  if (!message) {
    throw new Error('Contact message not found');
  }

  return message;
};

/**
 * Admin responds to a contact message
 * 
 * @param {String} messageId - Contact message MongoDB ID
 * @param {String} response - Admin's response
 * @param {String} adminId - Admin user ID who is responding
 * @returns {Object} Updated contact message
 */
const respondToContactMessage = async (messageId, response, adminId) => {
  // Verify admin exists
  const admin = await User.findById(adminId);
  if (!admin || admin.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  const message = await ContactSupport.findByIdAndUpdate(
    messageId,
    {
      adminResponse: response.trim(),
      respondedBy: adminId,
      respondedAt: new Date(),
      status: 'resolved', // Auto-update status to resolved when admin responds
    },
    { new: true, runValidators: true }
  )
    .populate('user', 'name email')
    .populate('respondedBy', 'name email')
    .lean();

  if (!message) {
    throw new Error('Contact message not found');
  }

  return message;
};

module.exports = {
  createContactMessage,
  getContactMessages,
  getContactMessageById,
  getUserContactMessages,
  updateContactMessageStatus,
  respondToContactMessage,
};
