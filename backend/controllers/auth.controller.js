const authService = require('../services/auth.services');
const { subscribeToFlodesk } = require('../services/flodeskService');

/**
 * @desc    Register a new user (admin or parent only) and subscribe to Flodesk
 * @route   POST /api/auth/register
 * @access  Public
 *
 * Saves user to MongoDB, then calls Flodesk subscribe. Registration succeeds even if Flodesk fails.
 *
 * Request body:
 * { "name": "John Doe", "email": "john@example.com", "password": "password123", "role": "parent" }
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, linkedParent } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const result = await authService.register({
      name,
      email,
      password,
      role: role || 'parent',
      linkedParent,
    });

    try {
      await subscribeToFlodesk(result.user.email);
    } catch (flodeskError) {
      console.error('[Auth] Flodesk subscription failed after registration:', flodeskError.message);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
};

/**
 * @desc    Register a new user (admin or parent only)
 * @route   POST /api/auth/register
 * @access  Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * Note: Children are NOT User accounts. They are created as ChildProfile records only.
 * Children don't have passwords or tokens - parent logs in and selects a child.
 * 
 * Request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "password123",
 *   "role": "parent" // or "admin" only. Teachers must be created by an admin. (children cannot be registered here)
 * }
 */
const register = registerUser;

/**
 * @desc    Subscribe email to Flodesk only (no user registration). Use for testing or standalone signup.
 * @route   POST /api/auth/subscribe-flodesk
 * @access  Public (no Bearer)
 * Body: { "email": "user@example.com" }
 */
const subscribeFlodesk = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email',
      });
    }

    const result = await subscribeToFlodesk(email.trim());
    res.status(200).json({
      success: true,
      message: 'Subscribed to Flodesk successfully',
      data: result,
    });
  } catch (error) {
    console.error('[Auth] subscribe-flodesk error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Flodesk subscription failed',
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * Request body:
 * {
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Call service
    const result = await authService.login(email, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed',
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 * 
 * @param {Object} req - Express request object (must have req.user from protect middleware)
 * @param {Object} res - Express response object
 */
const getMe = async (req, res) => {
  try {
    // req.user is set by protect middleware
    const userId = req.user._id;

    // Call service
    const result = await authService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      message: 'User data retrieved successfully',
      data: result,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || 'Failed to retrieve user data',
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * Note: Logout is primarily handled client-side by removing token
 * This endpoint can be used for server-side cleanup if needed
 */
const logout = async (req, res) => {
  try {
    const userId = req.user._id;

    // Call service
    const result = await authService.logout(userId);

    res.status(200).json({
      success: true,
      message: result.message || 'Logged out successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Logout failed',
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, email } = req.body;

    // Get user
    const { User } = require('../models');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
      }
      user.email = email.toLowerCase();
    }

    await user.save();

    // Get updated user (exclude password)
    const updatedUser = await User.findById(userId).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update profile',
    });
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    // Get user with password
    const { User } = require('../models');
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to change password',
    });
  }
};

/**
 * @desc    Get Terms & Conditions content (public, for display in modal)
 * @route   GET /api/auth/terms
 * @access  Public
 */
const getTerms = async (req, res) => {
  try {
    const result = await authService.getTermsContent();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load terms',
    });
  }
};

module.exports = {
  register,
  registerUser,
  subscribeFlodesk,
  login,
  getMe,
  logout,
  updateProfile,
  changePassword,
  getTerms,
};

