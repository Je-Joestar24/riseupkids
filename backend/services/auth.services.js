const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ChildProfile, ChildStats } = require('../models');

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
 * Creates a new user account
 * 
 * @param {Object} userData - User registration data
 * @param {String} userData.name - User's full name
 * @param {String} userData.email - User's email address
 * @param {String} userData.password - User's password
 * @param {String} userData.role - User's role (admin, parent, child)
 * @param {String} [userData.linkedParent] - Parent ID (required if role is 'child')
 * @returns {Object} User object with token
 * @throws {Error} If validation fails or user already exists
 */
const register = async (userData) => {
  const { name, email, password, role, linkedParent } = userData;

  // Validate required fields
  if (!name || !email || !password) {
    throw new Error('Please provide name, email, and password');
  }

  // Validate role
  if (!['admin', 'parent', 'child'].includes(role)) {
    throw new Error('Invalid role. Must be admin, parent, or child');
  }

  // If child, validate linkedParent
  if (role === 'child' && !linkedParent) {
    throw new Error('Child accounts must have a linked parent');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  // If child, verify parent exists
  if (role === 'child') {
    const parent = await User.findById(linkedParent);
    if (!parent) {
      throw new Error('Parent not found');
    }
    if (parent.role !== 'parent') {
      throw new Error('Linked user must be a parent');
    }
  }

  // Create user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    linkedParent: role === 'child' ? linkedParent : undefined,
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

  // If child, get parent info and child profile
  // Note: ChildProfile.parent references the parent User, not the child User
  // We need to find ChildProfile where parent matches the child's linkedParent
  if (user.role === 'child') {
    const parent = await User.findById(user.linkedParent).select('name email');
    // Find child profile by matching parent field with linkedParent
    // This assumes one child profile per parent-child relationship
    const childProfile = await ChildProfile.findOne({ parent: user.linkedParent })
      .populate('currentJourney', 'title description coverImage')
      .populate('currentLesson', 'title description coverImage');
    additionalData.parent = parent;
    additionalData.childProfile = childProfile;
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
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isActive) {
    throw new Error('Account is inactive');
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

  // If child, get parent info and child profile
  if (user.role === 'child') {
    const parent = await User.findById(user.linkedParent).select('name email');
    const childProfile = await ChildProfile.findOne({ parent: user.linkedParent })
      .populate('currentJourney', 'title description coverImage')
      .populate('currentLesson', 'title description coverImage');
    additionalData.parent = parent;
    additionalData.childProfile = childProfile;
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

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
  generateToken,
};

