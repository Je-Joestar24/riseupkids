const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, PasswordResetToken } = require('../models');
const { ChildProfile, ChildStats } = require('../models');
const mailService = require('./mail');
const legalContent = require('./legalContent.service');

/**
 * Generate JWT Token
 * 
 * Creates a signed JWT token with user ID
 * 
 * @param {String} userId - User's MongoDB ID
 * @returns {String} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Register/Signup Service
 * 
 * Creates a new user account via public registration (admin or parent only)
 * Note: Children are NOT User records - they are created as ChildProfile records only
 * 
 * @param {Object} userData - User registration data
 * @param {String} userData.name - User's full name
 * @param {String} userData.email - User's email address
 * @param {String} userData.password - User's password
 * @param {String} userData.role - User's role (admin or parent only)
 * @returns {Object} User object with token
 * @throws {Error} If validation fails or user already exists
 */
const register = async (userData) => {
  const { name, email, password, role } = userData;

  // Validate required fields
  if (!name || !email || !password) {
    throw new Error('Please provide name, email, and password');
  }

  // Validate role - only admin and parent can be created via public registration
  if (!['admin', 'parent'].includes(role)) {
    throw new Error('Invalid role. Must be admin or parent. Teachers and content creators must be created by an admin. Children are created as ChildProfile records, not User accounts.');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  // Create user (only admin or parent)
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
  });

  // Generate token
  const token = generateToken(user._id);

  // Get user data (exclude password)
  const userDataResponse = await User.findById(user._id).select('-password');

  return {
    user: userDataResponse,
    token,
  };
};

/**
 * Login Service
 * 
 * Authenticates user and returns token
 * 
 * @param {String} email - User's email
 * @param {String} password - User's password
 * @returns {Object} User object with token and additional data
 * @throws {Error} If credentials are invalid
 */
const login = async (email, password) => {
  // Validate input
  if (!email || !password) {
    throw new Error('Please provide email and password');
  }

  // Find user and include password for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is inactive. Please contact administrator.');
  }

  // Check password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Children don't have User accounts
  if (user.role === 'child') {
    throw new Error('Children do not have login accounts. Please login as a parent and select a child profile.');
  }

  // Get user data (exclude password)
  const userData = await User.findById(user._id).select('-password');

  // Get additional data based on role
  let additionalData = {};

  // If parent, get child profiles with stats
  if (user.role === 'parent') {
    const childProfiles = await ChildProfile.find({ parent: user._id, isActive: true }).lean();
    
    // Populate stats for each child
    const childProfilesWithStats = await Promise.all(
      childProfiles.map(async (child) => {
        const stats = await ChildStats.findOne({ child: child._id })
          .select('totalStars currentStreak totalBadges badges')
          .lean();
        
        return {
          ...child,
          stats: stats || {
            totalStars: 0,
            currentStreak: 0,
            totalBadges: 0,
            badges: [],
          },
        };
      })
    );
    
    additionalData.childProfiles = childProfilesWithStats;
  }

  // Generate token
  const token = generateToken(user._id);

  return {
    user: userData,
    token,
    ...additionalData,
  };
};

/**
 * Get Current User Service
 * 
 * Returns current authenticated user with all related data
 * 
 * @param {String} userId - User's MongoDB ID
 * @returns {Object} User object with all related data
 * @throws {Error} If user not found
 */
const getCurrentUser = async (userId) => {
  // Get user without password
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isActive) {
    throw new Error('Account is inactive');
  }

  // Children don't have User accounts
  if (user.role === 'child') {
    throw new Error('Children do not have User accounts. They are accessed through ChildProfile records.');
  }

  // Get additional data based on role
  let additionalData = {};

  // If parent, get child profiles with stats
  if (user.role === 'parent') {
    const childProfiles = await ChildProfile.find({ parent: user._id, isActive: true })
      .populate('currentJourney', 'title description')
      .populate('currentLesson', 'title description')
      .lean();
    
    // Populate stats for each child
    const childProfilesWithStats = await Promise.all(
      childProfiles.map(async (child) => {
        const stats = await ChildStats.findOne({ child: child._id })
          .select('totalStars currentStreak totalBadges badges')
          .lean();
        
        return {
          ...child,
          stats: stats || {
            totalStars: 0,
            currentStreak: 0,
            totalBadges: 0,
            badges: [],
          },
        };
      })
    );
    
    additionalData.childProfiles = childProfilesWithStats;
  }

  return {
    user,
    ...additionalData,
  };
};

/**
 * Logout Service
 * 
 * Currently, logout is handled client-side by removing token
 * This service can be extended for token blacklisting if needed
 * 
 * @param {String} userId - User's MongoDB ID
 * @returns {Object} Success message
 */
const logout = async (userId) => {
  // For now, logout is handled client-side
  // Future: Can implement token blacklisting here
  return {
    message: 'Logged out successfully',
  };
};

/**
 * Get current Terms & Conditions content (public).
 * Placeholder text until client provides final copy; can later be stored in DB or CMS.
 *
 * @returns {Object} { content: string }
 */
const getTermsContent = async () => legalContent.getTermsContent();

/** Expiry for reset code: 1 minute */
const RESET_CODE_EXPIRY_MS = 16 * 60 * 1000;

/**
 * Forgot password: user must exist; generate 6-digit code, store with expiry, send email.
 * @param {string} email - User's email
 * @returns {Promise<{ sent: boolean }>}
 * @throws {Error} When email is invalid or no account exists for that email
 */
const forgotPassword = async (email) => {
  const normalized = (email || '').toString().trim().toLowerCase();
  if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new Error('Please provide a valid email address');
  }

  const user = await User.findOne({ email: normalized });
  if (!user) {
    throw new Error('No account exists with this email address.');
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MS);

  await PasswordResetToken.deleteMany({ userId: user._id });
  await PasswordResetToken.create({
    userId: user._id,
    code,
    expiresAt,
  });

  try {
    await mailService.sendResetCode({ to: user.email, code });
  } catch (error) {
    console.error(
      `[Auth:forgotPassword] Failed to send reset code email to ${user.email}: ${error.message}`
    );
    throw error;
  }

  console.log(`[Auth:forgotPassword] Reset code email sent to ${user.email}`);
  return { sent: true };
};

/**
 * Reset password with email + code + newPassword. Validates code (match + not expired), updates password, deletes token.
 * @param {string} email
 * @param {string} code - 6-digit code
 * @param {string} newPassword
 */
const resetPassword = async (email, code, newPassword) => {
  const normalized = (email || '').toString().trim().toLowerCase();
  const codeStr = (code || '').toString().trim().replace(/\D/g, '').slice(0, 6);
  if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new Error('Please provide a valid email address');
  }
  if (codeStr.length !== 6) {
    throw new Error('Invalid or expired reset code');
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const user = await User.findOne({ email: normalized }).select('+password');
  if (!user) {
    throw new Error('Invalid or expired reset code');
  }

  const token = await PasswordResetToken.findOne({
    userId: user._id,
    code: codeStr,
    expiresAt: { $gt: new Date() },
  });
  if (!token) {
    throw new Error('Invalid or expired reset code');
  }

  user.password = newPassword;
  await user.save();

  await PasswordResetToken.deleteOne({ _id: token._id });
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
  generateToken,
  getTermsContent,
  forgotPassword,
  resetPassword,
};

