const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Authentication Middleware
 *
 * Protects routes by verifying JWT token
 * Attaches user object to request if authenticated
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token, return error
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please provide a token.',
    });
  }

  // Step 1: verify the JWT itself. A failure HERE (bad signature, expired, malformed) is a
  // genuine "not authenticated" case — safe to answer with 401.
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Invalid token.',
    });
  }

  // Step 2: everything past this point is a DB lookup, not a token check. A failure here (a
  // transient Mongo error, an unrelated bug) must NOT be reported as "invalid token" — clients
  // treat a 401 as "log the user out," and conflating a real server error with an invalid
  // session caused a production incident where users were logged out during a backend error that
  // had nothing to do with their session. Real errors go to the central error handler (500).
  try {
    const user = await User.findById(decoded.id).select('-password +tokenVersion');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found with this token.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive.',
      });
    }

    // Chunk 9: a token minted before a password change/reset/role change/deactivation carries a
    // stale tokenVersion claim and is rejected immediately, instead of staying valid until it
    // naturally expires. Tokens minted before this field existed have no claim (undefined) — only
    // reject when the user has actually been bumped past 0.
    if (
      typeof decoded.tokenVersion === 'number'
        ? decoded.tokenVersion !== (user.tokenVersion || 0)
        : (user.tokenVersion || 0) !== 0
    ) {
      return res.status(401).json({
        success: false,
        message: 'Session has been invalidated. Please log in again.',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Role-based Authorization Middleware
 *
 * Restricts access based on user roles
 * Must be used after protect middleware
 *
 * @param {...String} roles - Allowed roles
 * @returns {Function} Middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please authenticate first.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route.`,
      });
    }

    next();
  };
};

module.exports = { protect, authorize };
