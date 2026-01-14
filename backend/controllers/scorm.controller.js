const scormService = require('../services/scorm.service');
const courseProgressService = require('../services/courseProgress.services');
const AudioAssignment = require('../models/AudioAssignment');
const Chant = require('../models/Chant');
const Book = require('../models/Book');
const Media = require('../models/Media');
const { ChildProfile, ChildStats, StarEarning } = require('../models');
const CourseProgress = require('../models/CourseProgress');
const Course = require('../models/Course');
const path = require('path');
const fs = require('fs-extra');

// ============================================================
// Helper Functions for Completion Check
// ============================================================

/**
 * Parse SCORM time format (HH:MM:SS.SS) to seconds
 * @param {String} timeString - SCORM time string
 * @returns {Number} Time in seconds
 */
function parseTimeToSeconds(timeString) {
  if (!timeString || typeof timeString !== 'string' || timeString === '00:00:00.00') {
    return 0;
  }
  const parts = timeString.split(':');
  if (parts.length >= 3) {
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Calculate progress from lesson location
 * @param {String} lessonLocation - SCORM lesson location
 * @returns {Number} Progress percentage (0-100)
 */
function calculateProgressFromLocation(lessonLocation) {
  if (!lessonLocation || lessonLocation === '') {
    return 0;
  }
  // Try to extract slide/video number
  const numberMatch = lessonLocation.match(/(\d+)/);
  if (numberMatch) {
    const currentSlide = parseInt(numberMatch[1]);
    const estimatedTotalSlides = 40; // Adjust per SCORM package
    return Math.min((currentSlide / estimatedTotalSlides) * 100, 95);
  }
  return 0;
}

/**
 * @desc    Get SCORM launch URL
 * @route   GET /api/scorm/:contentId/launch
 * @access  Private
 * 
 * Query parameters:
 * - contentType: 'audioAssignment', 'chant', 'book', or 'video'
 */
const getLaunchUrl = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { contentType } = req.query;
    
    if (!contentType || !['audioAssignment', 'chant', 'book', 'video'].includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contentType. Must be "audioAssignment", "chant", "book", or "video"',
      });
    }
    
    // Get content with SCORM file
    let content;
    if (contentType === 'audioAssignment') {
      content = await AudioAssignment.findById(contentId);
    } else if (contentType === 'chant') {
      content = await Chant.findById(contentId);
    } else if (contentType === 'book') {
      content = await Book.findById(contentId);
    } else if (contentType === 'video') {
      content = await Media.findById(contentId);
    }
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }
    
    if (!content.scormFilePath && !content.scormFileUrl) {
      return res.status(404).json({
        success: false,
        message: 'SCORM file not found for this content',
      });
    }
    
    // Determine SCORM package path
    let scormPath = content.scormFilePath;
    
    // If scormFilePath is not set, try to construct from scormFileUrl
    if (!scormPath && content.scormFileUrl) {
      // Extract path from URL (remove base URL if present)
      const urlPath = content.scormFileUrl.replace(/^.*\/uploads\//, '');
      scormPath = path.join(__dirname, '../uploads', urlPath);
    }
    
    // Check if SCORM file exists
    if (!scormPath || !(await fs.pathExists(scormPath))) {
      return res.status(404).json({
        success: false,
        message: 'SCORM file not found on server',
      });
    }
    
    // Determine if file is ZIP (needs extraction) or already extracted
    const isZip = path.extname(scormPath).toLowerCase() === '.zip';
    
    let extractedPath;
    let entryPoint = 'index.html';
    
    if (isZip) {
      // Extract to a dedicated directory
      const extractDir = path.join(
        __dirname,
        '../uploads/scorm',
        contentType,
        contentId.toString(),
        'extracted'
      );
      
      // Check if already extracted
      if (await fs.pathExists(extractDir)) {
        extractedPath = extractDir;
      } else {
        // Extract now
        extractedPath = await scormService.extractScormPackage(scormPath, extractDir);
        await scormService.validateScormPackage(extractedPath);
      }
      
      // Get entry point from manifest
      const manifestPath = await scormService.findManifestFile(extractedPath);
      if (manifestPath) {
        entryPoint = await scormService.getScormEntryPoint(manifestPath, extractedPath);
      }
    } else {
      // Already extracted, use the path directly
      extractedPath = scormPath;
      
      // Try to find entry point
      const manifestPath = await scormService.findManifestFile(extractedPath);
      if (manifestPath) {
        entryPoint = await scormService.getScormEntryPoint(manifestPath, extractedPath);
      }
    }
    
    // Construct launch URL using wrapper endpoint to avoid cross-origin issues.
    //
    // IMPORTANT:
    // In dev, the frontend often runs on :3000 and proxies /api + /scorm to the backend.
    // If we return a hardcoded :5000 URL here, the SCORM wrapper runs cross-origin inside
    // an iframe on :3000, and some SCORM drivers (Rustici) will throw when probing window.parent,
    // resulting in "unable to acquire LMS API".
    //
    // So we build URLs from the incoming request host (works for both proxied dev and prod).
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const relativePath = path.relative(
      path.join(__dirname, '../uploads'),
      extractedPath
    );
    
    // Get auth token from request headers to pass to wrapper
    const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
    
    // Use wrapper endpoint instead of direct file URL
    // This ensures same-origin and allows API injection
    const launchUrl = `${baseUrl}/api/scorm/${contentId}/wrapper?contentType=${encodeURIComponent(contentType)}&entryPoint=${encodeURIComponent(entryPoint)}&path=${encodeURIComponent(relativePath.replace(/\\/g, '/'))}&token=${encodeURIComponent(authToken)}`;
    
    res.json({
      success: true,
      data: {
        launchUrl,
        entryPoint,
        extractedPath: relativePath.replace(/\\/g, '/'),
        contentType,
        contentId,
      },
    });
  } catch (error) {
    console.error('Error getting SCORM launch URL:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get SCORM launch URL',
    });
  }
};

/**
 * @desc    Save SCORM progress
 * @route   POST /api/scorm/:contentId/progress
 * @access  Private
 * 
 * Request body:
 * {
 *   "contentType": "audioAssignment" | "chant",
 *   "progressData": {
 *     "lessonStatus": "completed" | "incomplete" | "passed" | "failed" | "browsed" | "not attempted",
 *     "score": 85,
 *     "timeSpent": "00:15:30.00",
 *     "suspendData": "...",
 *     "entry": "ab-initio" | "resume",
 *     "exit": "normal" | "time-out" | "suspend" | "logout"
 *   }
 * }
 */
const saveProgress = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { contentType, progressData } = req.body;
    const userId = req.user._id;
    
    if (!contentType || !['audioAssignment', 'chant', 'book', 'video'].includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contentType. Must be "audioAssignment", "chant", "book", or "video"',
      });
    }
    
    if (!progressData) {
      return res.status(400).json({
        success: false,
        message: 'progressData is required',
      });
    }
    
    // Validate lesson status
    const validStatuses = ['passed', 'failed', 'completed', 'incomplete', 'browsed', 'not attempted'];
    if (progressData.lessonStatus && !validStatuses.includes(progressData.lessonStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid lessonStatus. Must be one of: ${validStatuses.join(', ')}`,
      });
    }
    
    // Get content to verify it exists
    let content;
    if (contentType === 'audioAssignment') {
      content = await AudioAssignment.findById(contentId);
    } else if (contentType === 'chant') {
      content = await Chant.findById(contentId);
    } else if (contentType === 'book') {
      content = await Book.findById(contentId);
    } else if (contentType === 'video') {
      content = await Media.findById(contentId);
    }
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }
    
    // Update course progress with SCORM data
    // Find the course that contains this content
    const Course = require('../models/Course');
    const course = await Course.findOne({
      'contents.contentId': contentId,
      'contents.contentType': contentType,
    });
    
    if (course) {
      // Update progress via courseProgressService
      // We'll need to find the child's progress for this course
      const ChildProfile = require('../models/ChildProfile');
      const child = await ChildProfile.findOne({ parent: userId });
      
      if (child) {
        // Phase 2: be defensive – SCORM progress should NEVER break playback
        // If course/content mapping is missing, log and continue without 500
        try {
          await courseProgressService.updateScormProgress(
            child._id,
            course._id,
            contentId,
            contentType,
            progressData
          );
        } catch (progressError) {
          console.warn(
            '[SCORM] Skipping course progress update for SCORM content:',
            progressError.message
          );
        }
      }
    }
    
    res.json({
      success: true,
      message: 'SCORM progress saved successfully',
      data: {
        contentId,
        contentType,
        progressData,
      },
    });
  } catch (error) {
    console.error('Error saving SCORM progress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save SCORM progress',
    });
  }
};

/**
 * @desc    Get SCORM progress
 * @route   GET /api/scorm/:contentId/progress
 * @access  Private
 * 
 * Query parameters:
 * - contentType: 'audioAssignment', 'chant', 'book', or 'video'
 */
const getProgress = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { contentType } = req.query;
    const userId = req.user._id;
    
    if (!contentType || !['audioAssignment', 'chant', 'book', 'video'].includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contentType. Must be "audioAssignment", "chant", "book", or "video"',
      });
    }
    
    // Find the course that contains this content
    const Course = require('../models/Course');
    const course = await Course.findOne({
      'contents.contentId': contentId,
      'contents.contentType': contentType,
    });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Content not found in any course',
      });
    }
    
    // Get child profile
    const ChildProfile = require('../models/ChildProfile');
    const child = await ChildProfile.findOne({ parent: userId });
    
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child profile not found',
      });
    }
    
    // Get progress from courseProgressService
    const progress = await courseProgressService.getScormProgress(
      child._id,
      course._id,
      contentId,
      contentType
    );
    
    res.json({
      success: true,
      data: progress || {
        lessonStatus: 'not attempted',
        score: null,
        timeSpent: '00:00:00.00',
        suspendData: '',
      },
    });
  } catch (error) {
    console.error('Error getting SCORM progress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get SCORM progress',
    });
  }
};

/**
 * @desc    Get SCORM wrapper HTML with API injected
 * @route   GET /api/scorm/:contentId/wrapper
 * @access  Private
 * 
 * Query parameters:
 * - contentType: 'audioAssignment', 'chant', 'book', or 'video'
 * - entryPoint: Entry point HTML file (e.g., 'index.html')
 * - path: Relative path to SCORM content from uploads directory
 * - token: Auth token for API calls
 */
const getWrapper = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { contentType, entryPoint, path: scormPath, token } = req.query;
    
    // Verify token if provided (optional for now, but recommended)
    let userId = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        console.warn('Invalid token in wrapper request:', err.message);
        // Continue anyway - token will be used for API calls
      }
    }
    
    if (!contentType || !['audioAssignment', 'chant', 'book', 'video'].includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contentType. Must be "audioAssignment", "chant", "book", or "video"',
      });
    }
    
    if (!entryPoint || !scormPath) {
      return res.status(400).json({
        success: false,
        message: 'entryPoint and path are required',
      });
    }
    
    // Instead of loading SCORM in iframe, we'll inject API directly into the HTML
    // Construct path to SCORM HTML file
    const cleanPath = scormPath.startsWith('scorm/') ? scormPath.replace(/^scorm\//, '') : scormPath;
    const scormBasePathForFiles = path.join(__dirname, '../uploads/scorm', cleanPath);
    const scormHtmlPath = path.join(scormBasePathForFiles, entryPoint);
    
    // Check if HTML file exists
    if (!(await fs.pathExists(scormHtmlPath))) {
      return res.status(404).json({
        success: false,
        message: 'SCORM HTML file not found',
      });
    }
    
    // Find the last video in the SCORM package (server-side)
    const findLastVideo = async function(scormBasePath) {
        try {
            const vrPath = path.join(scormBasePath, 'vr');
            if (!(await fs.pathExists(vrPath))) {
                return null;
            }
            
            const files = await fs.readdir(vrPath);
            const videoFiles = files.filter(file => 
                file.toLowerCase().endsWith('.mp4') || 
                file.toLowerCase().endsWith('.webm') ||
                file.toLowerCase().endsWith('.mov')
            );
            
            if (videoFiles.length === 0) {
                return null;
            }
            
            // Extract numbers from filenames (e.g., Vi35.mp4 -> 35)
            const videoNumbers = videoFiles.map(file => {
                const match = file.match(/(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            });
            
            // Sort by number and get the last one
            videoNumbers.sort((a, b) => a - b);
            const lastNumber = videoNumbers[videoNumbers.length - 1];
            
            // Find the file with the highest number
            const lastVideo = videoFiles.find(file => {
                const match = file.match(/(\d+)/);
                return match && parseInt(match[1], 10) === lastNumber;
            });
            
            if (lastVideo) {
                return {
                    filename: lastVideo,
                    path: path.join('vr', lastVideo),
                };
            }
            
            // Fallback: if no numbers found, use alphabetical sort
            videoFiles.sort();
            return {
                filename: videoFiles[videoFiles.length - 1],
                path: path.join('vr', videoFiles[videoFiles.length - 1]),
            };
        } catch (err) {
            console.error('Error finding last video:', err);
            return null;
        }
    };
    
    // Get the last video info (server-side)
    const lastVideoInfo = await findLastVideo(scormBasePathForFiles);
    if (lastVideoInfo) {
        console.log('[SCORM] Last video detected:', lastVideoInfo.filename);
    }
    
    // Read the SCORM HTML file
    let scormHtml = await fs.readFile(scormHtmlPath, 'utf-8');
    
    // Use request host so the wrapper + API calls are same-origin with the embedding app.
    // This is critical for SCORM drivers that probe window.parent during API discovery.
    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;
    const authToken = token || '';
    
    // Set base URL for relative path resolution.
    // Use request host so /scorm/* asset requests stay same-origin (and work with dev proxy).
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const scormBasePath = `/scorm/${cleanPath}`;
    
    // Generate API script that will be injected BEFORE any other scripts
    // This follows the guide pattern: API must exist BEFORE SCORM loads
    // When SCORM looks for window.API, it will find it = NO POPUP!
    const apiScript = `
    <script>
    // ============================================================
    // SCORM API SHIM - Following Guide Pattern
    // ============================================================
    // KEY INSIGHT: If window.API exists when SCORM checks for it,
    // the "unable to acquire LMS API" popup will NOT appear.
    // 
    // This script is injected in <head> BEFORE SCORM content loads,
    // ensuring window.API and window.API_1484_11 exist immediately.
    // ============================================================
    (function() {
        const contentId = '${contentId}';
        const contentType = '${contentType}';
        const userId = '${userId}';
        const apiBaseUrl = '${apiBaseUrl}';
        const authToken = '${authToken}';
        
        // CRITICAL: Override window.open and DisplayError BEFORE SCORM content loads
        // This prevents cross-origin errors when SCORM tries to access window.parent.open
        
        // Store original window.open
        const originalWindowOpen = window.open;
        
        // Create safe wrapper for window.open
        const safeWindowOpen = function(url, name, features) {
            try {
                // Try to use original window.open
                if (originalWindowOpen) {
                    return originalWindowOpen.call(window, url, name, features);
                }
                // Fallback: try native window.open
                return window.open(url, name, features);
            } catch (e) {
                // If it fails, log and return null (don't throw)
                console.warn('window.open failed (cross-origin):', e.message);
                return null;
            }
        };
        
        // Override window.open immediately
        window.open = safeWindowOpen;
        
        // CRITICAL: The SCORM content tries to READ window.parent.open at definition time
        // Since the wrapper is in an iframe whose parent is the React app (localhost:3000),
        // accessing window.parent.open from the wrapper causes a cross-origin SecurityError.
        // We CANNOT prevent the SecurityError from occurring when SCORM tries to READ it,
        // but we CAN suppress it so it doesn't break the SCORM content.
        
        // The SecurityError happens when SCORM's DisplayError function tries to access
        // window.parent.open. We've already overridden DisplayError to handle this gracefully.
        // The error is being caught by our global error handler, which is good.
        
        // We can't actually set window.parent.open due to cross-origin restrictions,
        // but that's okay - our error handler will catch the SecurityError and prevent it
        // from breaking the SCORM content.
        
        // Same for window.top
        try {
            if (window.top && window.top !== window) {
                try {
                    window.top.open = safeWindowOpen;
                } catch (e) {
                    // Cross-origin - can't set
                }
            }
        } catch (e) {
            // Ignore
        }
        
        // CRITICAL FIX: Provide required SCORM functions BEFORE SCORM content loads
        // The SCORM content expects WriteToDebug, DisplayError, and InitializeExecuted
        
        // 1. Provide WriteToDebug function that SCORM content expects
        // This is used extensively by the SCORM driver for debugging
        if (typeof window.WriteToDebug === 'undefined') {
            window.WriteToDebug = function(message) {
                // Log debug messages to console (can be filtered out in production)
                console.log('[SCORM Debug]', message);
            };
        }
        
        // 2. Provide ClearErrorInfo stub - SCORM content calls this before SCORM driver loads
        // This prevents "ClearErrorInfo is not defined" errors
        if (typeof window.ClearErrorInfo === 'undefined') {
            window.ClearErrorInfo = function() {
                // Try SCORM 2004 version first
                if (typeof window.SCORM2004_ClearErrorInfo === 'function') {
                    return window.SCORM2004_ClearErrorInfo();
                }
                // Try SCORM 1.2 version
                if (typeof window.SCORM_ClearErrorInfo === 'function') {
                    return window.SCORM_ClearErrorInfo();
                }
                // No-op if neither is available yet (will be called again when SCORM loads)
            };
        }
        
        // 3. Override confirm() to AUTO-CLICK OK for child application
        // SCORM uses confirm() in DisplayError - we make it return true automatically
        // This simulates clicking OK without user interaction
        const originalConfirm = window.confirm;
        window.confirm = function(message) {
            // If it's the "unable to acquire LMS API" error and we have API, auto-click OK
            if (message && message.includes('unable to acquire LMS API')) {
                if (isAPIValid(window.API_1484_11) || isAPIValid(window.API)) {
                    console.warn('[SCORM] ✅ Auto-clicking OK on "unable to acquire LMS API" - API is available');
                    return true; // Auto-click OK - SCORM continues
                }
            }
            // For other confirms, try original but catch errors
            try {
                if (originalConfirm) {
                    return originalConfirm.call(window, message);
                }
            } catch (e) {
                // If original fails, auto-click OK to continue
                console.warn('[SCORM] Confirm failed, auto-clicking OK:', e.message);
                return true;
            }
            // Default: auto-click OK to ensure SCORM continues
            return true;
        };
        console.log('[SCORM] ✅ confirm() overridden - will auto-click OK');
        
        // 4. Safe DisplayError that allows SCORM to continue WITHOUT popup
        // SCORM's DisplayError shows confirm() popup - we override to just log and continue
        const safeDisplayError = function(message) {
            // Log the error
            console.error('[SCORM Error]', message);
            
            // Check if this is the "unable to acquire LMS API" error
            if (message && message.includes('unable to acquire LMS API')) {
                // If we have an API available, log and continue (no popup)
                if (isAPIValid(window.API_1484_11) || isAPIValid(window.API)) {
                    console.warn('[SCORM] ✅ "unable to acquire LMS API" error - but API is available, continuing...');
                    // Just return - SCORM will continue its flow
                    // We don't show popup, but SCORM execution continues
                    return;
                }
            }
            
            // For other errors, just log (no popup) and continue
            // SCORM execution will continue normally
            // The key is we DON'T call confirm() or alert() - just log and return
        };
        
        // 5. Safe InitializeExecuted - allows SCORM to continue
        const safeInitializeExecuted = function(success, message) {
            if (success) {
                console.log('[SCORM] ✅ Initialize: Success');
            } else {
                // Suppress "unable to acquire LMS API" error if we have API
                if (message && message.includes('unable to acquire LMS API')) {
                    if (isAPIValid(window.API_1484_11) || isAPIValid(window.API)) {
                        console.warn('[SCORM] ✅ Suppressed "unable to acquire LMS API" - API available');
                        return; // No popup
                    }
                }
                // For other errors, just log - NO POPUPS
                console.error('[SCORM] Initialize Failed:', message || 'Unknown error');
                // DO NOT call alert() - prevents popups
            }
        };
        
        // CRITICAL: Override DisplayError IMMEDIATELY to suppress ALL popups
        // DisplayError is what shows the "unable to acquire LMS API" popup
        // We MUST override it before SCORM loads, and keep it overridden
        window.DisplayError = safeDisplayError;
        console.log('[SCORM] ✅ DisplayError overridden - popups suppressed');
        
        // CRITICAL: Smart InitializeExecuted wrapper
        // We can't pre-define it because SCORM declares it as a function,
        // so we'll wrap it after SCORM defines it
        const smartInitializeExecuted = function(success, message) {
            // If initialization failed with "unable to acquire LMS API" but we HAVE an API,
            // suppress the error and retry initialization with our API
            if (!success && message && message.includes('unable to acquire LMS API')) {
                // Check if our API is available
                if (isAPIValid(window.API_1484_11) || isAPIValid(window.API)) {
                    console.log('[SCORM Shim] API available but InitializeExecuted called with error - retrying...');
                    // Retry initialization after a short delay
                    setTimeout(function() {
                        try {
                            // Try to call SCORM2004_Initialize or SCORM_Initialize again
                            if (typeof window.SCORM2004_Initialize === 'function') {
                                window.SCORM2004_Initialize();
                            } else if (typeof window.SCORM_Initialize === 'function') {
                                window.SCORM_Initialize();
                            }
                        } catch (e) {
                            console.error('[SCORM Shim] Retry failed:', e);
                        }
                    }, 100);
                    // Suppress the error popup
                    console.warn('[SCORM Shim] Suppressed "unable to acquire LMS API" error - API is available');
                    return;
                }
            }
            
            // For other errors or success, use the safe handler
            safeInitializeExecuted(success, message);
        };
        
        // Function to wrap SCORM functions after they're defined
        const wrapScormFunctions = function() {
            // CRITICAL: Always keep DisplayError overridden to suppress popups
            // SCORM driver will try to redefine it, but we override it back
            if (window.DisplayError !== safeDisplayError) {
                const originalDisplayError = window.DisplayError;
                window.DisplayError = function(message) {
                    // Suppress "unable to acquire LMS API" popup if we have API
                    if (message && message.includes('unable to acquire LMS API')) {
                        if (isAPIValid(window.API_1484_11) || isAPIValid(window.API)) {
                            console.warn('[SCORM] Suppressed "unable to acquire LMS API" popup - API available');
                            return; // No popup
                        }
                    }
                    // For other errors, try original but catch cross-origin issues
                    try {
                        if (originalDisplayError && typeof originalDisplayError === 'function') {
                            return originalDisplayError.call(window, message);
                        }
                    } catch (e) {
                        if (e.name === 'SecurityError' || e.message.includes('cross-origin') || e.message.includes('open')) {
                            // Just log, don't show popup
                            console.error('[SCORM Error]', message);
                            return;
                        }
                        throw e;
                    }
                    // Fallback: just log
                    console.error('[SCORM Error]', message);
                };
                console.log('[SCORM] ✅ DisplayError re-overridden to suppress popups');
            }
            
            // Wrap InitializeExecuted AFTER SCORM declares it (to avoid "already declared" error)
            // Check if it's already wrapped by checking for a marker property
            if (typeof window.InitializeExecuted === 'function' && !window.InitializeExecuted.__scormWrapped) {
                const originalInitializeExecuted = window.InitializeExecuted;
                window.InitializeExecuted = function(success, message) {
                    // If initialization failed with "unable to acquire LMS API" but we HAVE an API,
                    // retry initialization and then continue SCORM flow
                    if (!success && message && message.includes('unable to acquire LMS API')) {
                        if (isAPIValid(window.API_1484_11) || isAPIValid(window.API)) {
                            console.warn('[SCORM Shim] "unable to acquire LMS API" but API available - retrying initialization...');
                            
                            // Retry initialization immediately
                            try {
                                if (typeof window.SCORM2004_Initialize === 'function') {
                                    const retryResult = window.SCORM2004_Initialize();
                                    if (retryResult !== false) {
                                        console.log('[SCORM Shim] ✅ Retry successful - SCORM continuing');
                                        // Call original with success=true to continue SCORM flow
                                        return originalInitializeExecuted.call(window, true, '');
                                    }
                                } else if (typeof window.SCORM_Initialize === 'function') {
                                    const retryResult = window.SCORM_Initialize();
                                    if (retryResult !== false) {
                                        console.log('[SCORM Shim] ✅ Retry successful - SCORM continuing');
                                        return originalInitializeExecuted.call(window, true, '');
                                    }
                                }
                            } catch (e) {
                                console.error('[SCORM Shim] Retry failed:', e);
                            }
                            
                            // If retry didn't work, still continue SCORM flow with success=true
                            // This ensures SCORM opens even if there was an error
                            console.warn('[SCORM Shim] Continuing SCORM flow despite error - API is available');
                            return originalInitializeExecuted.call(window, true, '');
                        }
                    }
                    
                    // For other cases, call original function normally
                    try {
                        return originalInitializeExecuted.call(window, success, message);
                    } catch (e) {
                        if (e.name === 'SecurityError' || e.message.includes('cross-origin') || e.message.includes('open')) {
                            // On cross-origin error, continue with success to keep SCORM working
                            console.warn('[SCORM Shim] Cross-origin error, continuing SCORM flow');
                            return originalInitializeExecuted.call(window, true, '');
                        }
                        throw e;
                    }
                };
                // Mark as wrapped to prevent re-wrapping
                window.InitializeExecuted.__scormWrapped = true;
            }
        };
        
        // Function to shim SCORM API discovery functions (run after SCORM driver loads)
        const shimScormAPIDiscovery = function() {
            // Store our API reference
            const ourAPI = api;
            const ourAPI2004 = api;
            
            // Re-shim SCORM 2004 functions if SCORM driver redefined them
            if (typeof window.SCORM2004_GrabAPI === 'function') {
                const originalGrab = window.SCORM2004_GrabAPI;
                window.SCORM2004_GrabAPI = function() {
                    // Try our API first
                    if (isAPIValid(ourAPI2004)) {
                        return ourAPI2004;
                    }
                    // Fallback to original (but catch cross-origin errors)
                    try {
                        return originalGrab.call(window);
                    } catch (e) {
                        if (e.name === 'SecurityError' || e.message.includes('cross-origin')) {
                            console.warn('[SCORM Shim] Parent access blocked, using current window API');
                            return ourAPI2004 || ourAPI;
                        }
                        throw e;
                    }
                };
            }
            
            if (typeof window.SCORM2004_GetAPI === 'function') {
                const originalGet = window.SCORM2004_GetAPI;
                window.SCORM2004_GetAPI = function() {
                    if (isAPIValid(ourAPI2004)) {
                        return ourAPI2004;
                    }
                    try {
                        return originalGet.call(window);
                    } catch (e) {
                        if (e.name === 'SecurityError') {
                            return ourAPI2004 || ourAPI;
                        }
                        throw e;
                    }
                };
            }
            
            // Re-shim SCORM 1.2 functions
            if (typeof window.SCORM_GrabAPI === 'function') {
                const originalGrab = window.SCORM_GrabAPI;
                window.SCORM_GrabAPI = function() {
                    if (isAPIValid(ourAPI)) {
                        return ourAPI;
                    }
                    try {
                        return originalGrab.call(window);
                    } catch (e) {
                        if (e.name === 'SecurityError' || e.message.includes('cross-origin')) {
                            console.warn('[SCORM Shim] Parent access blocked, using current window API');
                            return ourAPI || ourAPI2004;
                        }
                        throw e;
                    }
                };
            }
            
            if (typeof window.SCORM_GetAPI === 'function') {
                const originalGet = window.SCORM_GetAPI;
                window.SCORM_GetAPI = function() {
                    if (isAPIValid(ourAPI)) {
                        return ourAPI;
                    }
                    try {
                        return originalGet.call(window);
                    } catch (e) {
                        if (e.name === 'SecurityError') {
                            return ourAPI || ourAPI2004;
                        }
                        throw e;
                    }
                };
            }
        };
        
        // Try wrapping at different intervals to catch SCORM functions when they're defined
        // Start immediately and check frequently - SCORM might load quickly
        wrapScormFunctions(); // Try immediately
        setTimeout(wrapScormFunctions, 10);
        setTimeout(wrapScormFunctions, 50);
        setTimeout(wrapScormFunctions, 100);
        setTimeout(wrapScormFunctions, 200);
        setTimeout(wrapScormFunctions, 500);
        setTimeout(wrapScormFunctions, 1000);
        setTimeout(wrapScormFunctions, 2000);
        
        // Also shim API discovery functions after SCORM driver loads
        setTimeout(shimScormAPIDiscovery, 100);
        setTimeout(shimScormAPIDiscovery, 300);
        setTimeout(shimScormAPIDiscovery, 600);
        setTimeout(shimScormAPIDiscovery, 1200);
        
        // CRITICAL: Override SCORM Initialize functions to catch errors and use our API
        const overrideInitializeFunctions = function() {
            // Override SCORM2004_Initialize
            if (typeof window.SCORM2004_Initialize === 'function') {
                const originalInit = window.SCORM2004_Initialize;
                window.SCORM2004_Initialize = function() {
                    try {
                        return originalInit.call(window);
                    } catch (e) {
                        if (e.name === 'SecurityError' || (e.message && e.message.includes('cross-origin'))) {
                            console.warn('[SCORM Shim] SCORM2004_Initialize caught SecurityError, using our API');
                            // Force set the API and retry
                            if (typeof window.SCORM2004_objAPI === 'undefined' || window.SCORM2004_objAPI === null) {
                                window.SCORM2004_objAPI = api;
                            }
                            // Try to call Initialize on our API directly
                            try {
                                if (api && typeof api.Initialize === 'function') {
                                    const result = api.Initialize('');
                                    if (result === 'true') {
                                        if (typeof window.InitializeExecuted === 'function') {
                                            window.InitializeExecuted(true, '');
                                        }
                                        return;
                                    }
                                }
                            } catch (e2) {
                                console.error('[SCORM Shim] Direct API Initialize failed:', e2);
                            }
                        }
                        throw e;
                    }
                };
            }
            
            // Override SCORM_Initialize (1.2)
            if (typeof window.SCORM_Initialize === 'function') {
                const originalInit = window.SCORM_Initialize;
                window.SCORM_Initialize = function() {
                    try {
                        return originalInit.call(window);
                    } catch (e) {
                        if (e.name === 'SecurityError' || (e.message && e.message.includes('cross-origin'))) {
                            console.warn('[SCORM Shim] SCORM_Initialize caught SecurityError, using our API');
                            // Force set the API and retry
                            if (typeof window.SCORM_objAPI === 'undefined' || window.SCORM_objAPI === null) {
                                window.SCORM_objAPI = api;
                            }
                            // Try to call LMSInitialize on our API directly
                            try {
                                if (api && typeof api.LMSInitialize === 'function') {
                                    const result = api.LMSInitialize('');
                                    if (result === 'true') {
                                        if (typeof window.InitializeExecuted === 'function') {
                                            window.InitializeExecuted(true, '');
                                        }
                                        return;
                                    }
                                }
                            } catch (e2) {
                                console.error('[SCORM Shim] Direct API LMSInitialize failed:', e2);
                            }
                        }
                        throw e;
                    }
                };
            }
        };
        
        // Try to override Initialize functions at multiple intervals
        setTimeout(overrideInitializeFunctions, 50);
        setTimeout(overrideInitializeFunctions, 150);
        setTimeout(overrideInitializeFunctions, 400);
        setTimeout(overrideInitializeFunctions, 800);
        setTimeout(overrideInitializeFunctions, 1500);
        
        // Also wrap the entire window object's property access to catch SecurityErrors
        // This is a last resort - if SCORM tries to read window.parent.open, we'll catch it
        // Note: We can't actually prevent the read, but we can ensure DisplayError handles it
        const originalErrorHandler = window.onerror;
        window.onerror = function(msg, url, line, col, error) {
            // Catch SecurityErrors related to window.parent.open
            if (error && error.name === 'SecurityError' && 
                (msg.includes('open') || msg.includes('parent') || msg.includes('cross-origin'))) {
                console.warn('Caught SecurityError (likely window.parent.open access):', msg);
                // Don't let this error propagate - it's expected
                return true; // Prevent default error handling
            }
            // For other errors, use original handler
            if (originalErrorHandler) {
                return originalErrorHandler.call(window, msg, url, line, col, error);
            }
            return false;
        };
        
        // ============================================================
        // SIMPLE SCORM API IMPLEMENTATION
        // Following the guide pattern: Create API BEFORE SCORM loads
        // This prevents "unable to acquire LMS API" popup entirely
        // ============================================================
        
        // SCORM API class - Simple implementation that SCORM can find immediately
        class SCORMAPI {
            constructor(contentId, contentType, userId) {
                this.contentId = contentId;
                this.contentType = contentType;
                this.userId = userId;
                this.initialized = false;
                this.data = {};
                this.errorCode = 0;
                this.errorString = '';
                this.diagnostic = '';
                this.commitTimer = null;
                this.hasUncommittedChanges = false;
                
                // PHASE 1: Progress tracking to prevent automatic completion
                this.progressData = {
                    firstInteraction: false,        // Has child interacted with content?
                    minProgressRequired: 80,         // Minimum progress % to consider complete
                    currentProgress: 0,              // Current progress percentage (0-100)
                    timeSpent: 0,                   // Time spent in seconds
                    lastVideoReached: false,         // Has child reached last video?
                    finalImageReached: false,        // Has child reached final image?
                    minTimeRequired: 30,             // Minimum time in seconds before allowing completion
                    sessionStartTime: Date.now(),    // Track session start for manual time calculation
                };
                
                console.log('[SCORM API] Created API instance for', contentType, contentId);
            }
            
            LMSInitialize(parameter = '') {
                if (this.initialized) {
                    this.errorCode = 101;
                    this.errorString = 'Already initialized';
                    return 'false';
                }
                
                // Set initialized immediately so SCORM content knows API is ready
                // This fixes "LMS Driver not loaded" error
                this.initialized = true;
                this.errorCode = 0;
                
                // Load existing progress asynchronously (don't block initialization)
                fetch(apiBaseUrl + '/api/scorm/' + contentId + '/progress?contentType=' + contentType, {
                    headers: {
                        'Authorization': 'Bearer ' + authToken,
                    }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data) {
                        if (data.data.suspendData) {
                            this.data['cmi.suspend_data'] = data.data.suspendData;
                        }
                        if (data.data.lessonStatus) {
                            this.data['cmi.core.lesson_status'] = data.data.lessonStatus;
                        }
                        if (data.data.score !== null && data.data.score !== undefined) {
                            this.data['cmi.core.score.raw'] = String(data.data.score);
                        }
                        if (data.data.timeSpent) {
                            this.data['cmi.core.total_time'] = data.data.timeSpent;
                        }
                    }
                })
                .catch(err => {
                    console.error('Failed to load progress:', err);
                    // Continue anyway - will use defaults
                });
                
                return 'true';
            }
            
            LMSGetValue(element) {
                if (!this.initialized) {
                    this.errorCode = 301;
                    return '';
                }
                
                if (!element || typeof element !== 'string') {
                    this.errorCode = 201;
                    return '';
                }
                
                const value = this.data[element] || this.getDefaultValue(element);
                this.errorCode = 0;
                return value;
            }
            
            LMSSetValue(element, value) {
                if (!this.initialized) {
                    this.errorCode = 301;
                    return 'false';
                }
                
                if (!element || typeof element !== 'string') {
                    this.errorCode = 201;
                    return 'false';
                }
                
                // PHASE 1: Validate score/status changes to prevent automatic completion
                // Block automatic 100-point award on open
                if (element === 'cmi.core.score.raw' || element === 'cmi.score.raw') {
                    // Handle empty/invalid score values
                    if (!value || value === '' || value === 'undefined' || value === 'null') {
                        // Don't store empty scores
                        this.errorCode = 0;
                        return 'true';
                    }
                    
                    const score = parseFloat(value);
                    // Check if score is valid number
                    if (isNaN(score)) {
                        console.log('[SCORM Validation] Invalid score value:', value, '- ignoring');
                        this.errorCode = 0;
                        return 'true';
                    }
                    
                    // Get max score for logging
                    const maxScore = this.data['cmi.core.score.max'] ? parseFloat(this.data['cmi.core.score.max']) : null;
                    const minScore = this.data['cmi.core.score.min'] ? parseFloat(this.data['cmi.core.score.min']) : null;
                    
                    // Log score changes with max score
                    this.progressData.lastScore = score;
                    console.log('[SCORM Progress] Score set:', score, 
                               'Max:', maxScore !== null ? maxScore : 'N/A', 
                               'Min:', minScore !== null ? minScore : 'N/A',
                               'Progress:', this.progressData.currentProgress + '%', 
                               'Time:', this.progressData.timeSpent + 's');
                    
                    // Only accept 100-point score if:
                    // - Final image has been reached, OR
                    // - Last video reached AND time spent >= 30 seconds, OR
                    // - Progress is at least 80% AND time spent >= 30 seconds
                    if (score === 100 && !this.progressData.finalImageReached) {
                        const canAcceptScore = 
                            (this.progressData.lastVideoReached && this.progressData.timeSpent >= this.progressData.minTimeRequired) ||
                            (this.progressData.currentProgress >= this.progressData.minProgressRequired && this.progressData.timeSpent >= this.progressData.minTimeRequired);
                        
                        if (!canAcceptScore) {
                            console.log('[SCORM Validation] Blocked automatic 100-point award - insufficient progress. Progress:', this.progressData.currentProgress + '%', 'Time:', this.progressData.timeSpent + 's', 'Last video:', this.progressData.lastVideoReached, 'Max score:', maxScore !== null ? maxScore : 'N/A');
                            // Return success but don't store the score
                            this.errorCode = 0;
                            return 'true';
                        }
                    }
                }
                
                // Block automatic completion status on open (but log it)
                if (element === 'cmi.core.lesson_status' || element === 'cmi.completion_status') {
                    const status = (value || '').toLowerCase();
                    if (status === 'completed' || status === 'passed') {
                        // Log but don't auto-complete - user must click "Done" button
                        console.log('[SCORM Validation] Status set to', status, '- but completion requires "Done" button click. Progress:', this.progressData.currentProgress + '%', 'Time:', this.progressData.timeSpent + 's', 'Last video:', this.progressData.lastVideoReached);
                        // Store the status for logging, but don't trigger completion
                        this.data[element] = value;
                        this.errorCode = 0;
                        return 'true';
                    }
                }
                
                // Track first interaction (any non-default value set)
                if (!this.progressData.firstInteraction && value && value !== '' && value !== 'not attempted') {
                    this.progressData.firstInteraction = true;
                    console.log('[SCORM Progress] First interaction detected');
                }
                
                // Store the value normally if validation passes
                this.data[element] = value;
                this.hasUncommittedChanges = true;
                this.errorCode = 0;
                
                if (this.commitTimer) {
                    clearTimeout(this.commitTimer);
                }
                this.commitTimer = setTimeout(() => {
                    this.LMSCommit('');
                }, 5000);
                
                return 'true';
            }
            
            LMSCommit(parameter = '') {
                if (!this.initialized) {
                    this.errorCode = 301;
                    return 'false';
                }
                
                const progressData = {
                    lessonStatus: this.data['cmi.core.lesson_status'] || 'incomplete',
                    score: this.data['cmi.core.score.raw'] ? parseFloat(this.data['cmi.core.score.raw']) : null,
                    scoreMax: this.data['cmi.core.score.max'] ? parseFloat(this.data['cmi.core.score.max']) : null,
                    scoreMin: this.data['cmi.core.score.min'] ? parseFloat(this.data['cmi.core.score.min']) : null,
                    timeSpent: this.data['cmi.core.total_time'] || '00:00:00.00',
                    suspendData: this.data['cmi.suspend_data'] || '',
                    entry: this.data['cmi.core.entry'] || 'ab-initio',
                    exit: this.data['cmi.core.exit'] || 'normal',
                    lessonLocation: this.data['cmi.core.lesson_location'] || '',
                    lastVideoReached: this.progressData.lastVideoReached || false, // Store for completion check
                };
                
                fetch(apiBaseUrl + '/api/scorm/' + contentId + '/progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken,
                    },
                    body: JSON.stringify({
                        contentType: contentType,
                        progressData: progressData
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        this.hasUncommittedChanges = false;
                    }
                })
                .catch(err => {
                    console.error('Failed to save progress:', err);
                });
                
                this.errorCode = 0;
                return 'true';
            }
            
            LMSFinish(parameter = '') {
                if (!this.initialized) {
                    this.errorCode = 301;
                    return 'false';
                }
                
                this.LMSCommit('');
                this.initialized = false;
                this.errorCode = 0;
                return 'true';
            }
            
            LMSGetLastError() {
                return String(this.errorCode);
            }
            
            LMSGetErrorString(errorCode) {
                const errorStrings = {
                    0: 'No error',
                    101: 'General exception',
                    201: 'Invalid argument error',
                    301: 'Element cannot have children',
                    401: 'Element not an array - cannot have count',
                    402: 'Element is empty - cannot have count',
                    403: 'Element not initialized',
                    404: 'Element not found',
                    405: 'Element is read only',
                    406: 'Element is write only',
                    407: 'Element is a keyword and cannot be changed',
                };
                return errorStrings[errorCode] || 'Unknown error';
            }
            
            LMSGetDiagnostic(errorCode) {
                return this.LMSGetErrorString(errorCode);
            }
            
            getDefaultValue(element) {
                const defaults = {
                    'cmi.core.lesson_status': 'not attempted',
                    'cmi.core.score.raw': '',
                    'cmi.core.score.max': '',
                    'cmi.core.score.min': '',
                    'cmi.core.total_time': '00:00:00.00',
                    'cmi.suspend_data': '',
                    'cmi.core.entry': 'ab-initio',
                    'cmi.core.exit': '',
                    'cmi.core.lesson_location': '',
                };
                return defaults[element] || '';
            }
            
            // PHASE 1: Helper function to parse SCORM time format (HH:MM:SS.SS) to seconds
            parseTimeToSeconds(timeString) {
                if (!timeString || typeof timeString !== 'string' || timeString === '' || timeString === '00:00:00.00') {
                    // If SCORM doesn't provide time, calculate from session start
                    const sessionDuration = Math.floor((Date.now() - this.progressData.sessionStartTime) / 1000);
                    return sessionDuration;
                }
                // SCORM time format: HH:MM:SS.SS or HH:MM:SS
                const parts = timeString.split(':');
                if (parts.length >= 3) {
                    const hours = parseInt(parts[0]) || 0;
                    const minutes = parseInt(parts[1]) || 0;
                    const seconds = parseFloat(parts[2]) || 0;
                    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                    // Use the larger of SCORM time or session time (in case SCORM resets)
                    const sessionDuration = Math.floor((Date.now() - this.progressData.sessionStartTime) / 1000);
                    return Math.max(totalSeconds, sessionDuration);
                }
                // Fallback to session time
                return Math.floor((Date.now() - this.progressData.sessionStartTime) / 1000);
            }
            
            // PHASE 1: Calculate progress based on lesson location, time, and video detection
            calculateProgress(lessonLocation, timeSpentSeconds, isLastVideoPlaying, isScormEnded) {
                let progress = 0;
                
                // Base progress from lesson location (if available)
                if (lessonLocation && lessonLocation !== '') {
                    // Try to extract slide/video number from lesson location
                    // Examples: "slide_5", "vr/Vi35.mp4", "page_10", etc.
                    const numberMatch = lessonLocation.match(/(\d+)/);
                    if (numberMatch) {
                        const currentSlide = parseInt(numberMatch[1]);
                        // Estimate total slides based on last video number (if available)
                        // This is a heuristic - may need adjustment per SCORM package
                        // For now, assume last video is around slide 30-40, so we estimate 40 total
                        const estimatedTotalSlides = 40;
                        progress = Math.min((currentSlide / estimatedTotalSlides) * 90, 90);
                    } else {
                        // If no number found, check for keywords
                        if (lessonLocation.includes('final') || lessonLocation.includes('end') || 
                            lessonLocation.includes('complete') || lessonLocation.includes('last')) {
                            progress = 95;
                        } else if (lessonLocation.includes('start') || lessonLocation.includes('begin')) {
                            progress = 5;
                        } else {
                            // Default: assume some progress if location is set
                            progress = 20;
                        }
                    }
                }
                
                // Boost progress if last video is playing
                if (isLastVideoPlaying) {
                    progress = Math.max(progress, 90);
                }
                
                // Full progress if SCORM ended (final image reached)
                if (isScormEnded) {
                    progress = 100;
                }
                
                // Time-based cap: must spend at least minimum time
                // If too fast, cap progress at 50% (unless final image reached)
                if (timeSpentSeconds < this.progressData.minTimeRequired && !isScormEnded) {
                    progress = Math.min(progress, 50);
                }
                
                return Math.min(Math.max(progress, 0), 100);
            }
        }
        
        // ============================================================
        // CRITICAL: Create API IMMEDIATELY - BEFORE any SCORM scripts run
        // This is the KEY to preventing "unable to acquire LMS API" popup
        // Following the guide pattern: API must exist when SCORM looks for it
        // ============================================================
        
        // Create API instance IMMEDIATELY
        const api = new SCORMAPI(contentId, contentType, userId);
        
        // Last video information injected from server (may be null)
        // Used for detecting when the final VR video is playing
        const lastVideoInfo = ${JSON.stringify(lastVideoInfo || null)};
        
        // Helper to check if an API object is valid (matches SCORM driver's check)
        const isAPIValid = function(obj) {
            return obj !== null && typeof obj !== 'undefined' && 
                   typeof obj !== 'boolean' && obj !== false;
        };
        
        // ============================================================
        // KEY: Inject API IMMEDIATELY (following guide pattern)
        // SCORM looks for window.API and window.API_1484_11
        // If they exist when SCORM checks, NO POPUP appears!
        // ============================================================
        
        // Inject into window IMMEDIATELY - SCORM 1.2
        window.API = api;
        console.log('[SCORM API] ✅ window.API created - SCORM will find this!');
        
        // Inject into window IMMEDIATELY - SCORM 2004  
        window.API_1484_11 = api;
        console.log('[SCORM API] ✅ window.API_1484_11 created - SCORM will find this!');
        
        // Ensure API stays available (monitor and restore if cleared)
        const ensureAPIAvailable = function() {
            if (!window.API || window.API === null || window.API === undefined) {
                window.API = api;
                console.log('[SCORM API] Restored window.API');
            }
            if (!window.API_1484_11 || window.API_1484_11 === null || window.API_1484_11 === undefined) {
                window.API_1484_11 = api;
                console.log('[SCORM API] Restored window.API_1484_11');
            }
        };
        
        // Monitor every 100ms to ensure API is always available
        setInterval(ensureAPIAvailable, 100);
        
        // CRITICAL: Continuously monitor and override DisplayError to prevent popups
        // SCORM driver may try to redefine it, so we keep overriding it back
        const ensureDisplayErrorSuppressed = function() {
            if (window.DisplayError !== safeDisplayError) {
                window.DisplayError = safeDisplayError;
                console.log('[SCORM] ✅ DisplayError re-overridden to suppress popups');
            }
        };
        
        // Monitor every 50ms to ensure DisplayError stays overridden
        setInterval(ensureDisplayErrorSuppressed, 50);
        
        // CRITICAL: Also make API available via LMSDriverHolder if SCORM content uses it
        // Some SCORM content checks for LMSDriverHolder.IsLoaded()
        if (typeof window.LMSDriverHolder === 'undefined') {
            window.LMSDriverHolder = {
                IsLoaded: function() {
                    return typeof window.API !== 'undefined' && window.API !== null;
                },
                GetAPI: function() {
                    return window.API;
                }
            };
        }
        
        // ============================================================
        // SCORM DRIVER SHIM - Override API discovery to avoid parent checks
        // ============================================================
        // The SCORM driver (scormdriver.js) searches parent windows first,
        // which fails with cross-origin errors. We shim the discovery functions
        // to return our API immediately without checking parents.
        
        // SHIM 1: Override SCORM 2004 API discovery
        // This runs BEFORE scormdriver.js loads, so our version takes precedence
        if (typeof window.SCORM2004_GrabAPI === 'undefined') {
            window.SCORM2004_GrabAPI = function() {
                // Check current window first (our injected API)
                if (isAPIValid(window.API_1484_11)) {
                    console.log('[SCORM Shim] Found API_1484_11 in current window');
                    return window.API_1484_11;
                }
                if (isAPIValid(window.API)) {
                    console.log('[SCORM Shim] Found API (1.2) in current window, using for 2004');
                    return window.API;
                }
                // Don't check parents - return null and let SCORM driver handle it
                console.warn('[SCORM Shim] No API found in current window');
                return null;
            };
        }
        
        if (typeof window.SCORM2004_GetAPI === 'undefined') {
            window.SCORM2004_GetAPI = function() {
                // Return our API immediately, skip parent search
                if (isAPIValid(window.API_1484_11)) {
                    return window.API_1484_11;
                }
                if (isAPIValid(window.API)) {
                    return window.API;
                }
                return null;
            };
        }
        
        if (typeof window.SCORM2004_SearchForAPI === 'undefined') {
            window.SCORM2004_SearchForAPI = function(wndLookIn) {
                // Always check current window first, skip parent/opener/children
                if (isAPIValid(window.API_1484_11)) {
                    return window.API_1484_11;
                }
                if (isAPIValid(window.API)) {
                    return window.API;
                }
                return null;
            };
        }
        
        // SHIM 2: Override SCORM 1.2 API discovery
        if (typeof window.SCORM_GrabAPI === 'undefined') {
            window.SCORM_GrabAPI = function() {
                // Check current window first (our injected API)
                if (isAPIValid(window.API)) {
                    console.log('[SCORM Shim] Found API (1.2) in current window');
                    return window.API;
                }
                if (isAPIValid(window.API_1484_11)) {
                    console.log('[SCORM Shim] Found API_1484_11 in current window, using for 1.2');
                    return window.API_1484_11;
                }
                console.warn('[SCORM Shim] No API found in current window');
                return null;
            };
        }
        
        if (typeof window.SCORM_GetAPI === 'undefined') {
            window.SCORM_GetAPI = function() {
                // Return our API immediately, skip parent search
                if (isAPIValid(window.API)) {
                    return window.API;
                }
                if (isAPIValid(window.API_1484_11)) {
                    return window.API_1484_11;
                }
                return null;
            };
        }
        
        // SHIM 3: Override API validation functions to accept our API
        if (typeof window.SCORM2004_APIFound === 'undefined') {
            window.SCORM2004_APIFound = function(obj) {
                return isAPIValid(obj);
            };
        }
        
        if (typeof window.SCORM_APIFound === 'undefined') {
            window.SCORM_APIFound = function(obj) {
                return isAPIValid(obj);
            };
        }
        
        console.log('[SCORM Shim] API discovery functions shimmed - API will be found in current window');
        
        // ============================================================
        // PHASE 1: Force SCORM internal API variables to always see our API
        // ============================================================
        // SCORM2004_Initialize and SCORM_Initialize both check:
        //   if (typeof(SCORM2004_objAPI) == \"undefined\" || SCORM2004_objAPI == null) { ...error... }
        //
        // To *guarantee* this check passes, we redefine SCORM2004_objAPI and SCORM_objAPI
        // as accessor properties whose getter always returns our API instance.
        // The setter ignores assignments from SCORM's SCORM2004_GrabAPI(), so even if
        // GrabAPI returns null, the subsequent check still sees a valid API.
        //
        // This is the core of Phase 1: remove the root cause of
        // \"Error - unable to acquire LMS API\" inside SCORM2004_Initialize.
        try {
            const apiGetter = function() {
                return api;
            };
            const apiSetter = function(value) {
                // SCORM will call SCORM2004_objAPI = SCORM2004_GrabAPI();
                // We intentionally ignore the assigned value to keep our API bound.
                // Optionally, we could log the attempted value for debugging:
                // console.log('[SCORM Shim] SCORM tried to set SCORM2004_objAPI to:', value);
            };
            
            // Redefine SCORM2004_objAPI with getter/setter
            try {
                Object.defineProperty(window, 'SCORM2004_objAPI', {
                    configurable: true,
                    enumerable: true,
                    get: apiGetter,
                    set: apiSetter,
                });
                console.log('[SCORM Shim] ✅ SCORM2004_objAPI accessor defined');
            } catch (e) {
                console.warn('[SCORM Shim] Could not redefine SCORM2004_objAPI accessor:', e.message);
                // Fallback: direct assignment (less robust, but better than nothing)
                window.SCORM2004_objAPI = api;
            }
            
            // Redefine SCORM_objAPI with getter/setter
            try {
                Object.defineProperty(window, 'SCORM_objAPI', {
                    configurable: true,
                    enumerable: true,
                    get: apiGetter,
                    set: apiSetter,
                });
                console.log('[SCORM Shim] ✅ SCORM_objAPI accessor defined');
            } catch (e) {
                console.warn('[SCORM Shim] Could not redefine SCORM_objAPI accessor:', e.message);
                // Fallback: direct assignment
                window.SCORM_objAPI = api;
            }
        } catch (e) {
            console.error('[SCORM Shim] Error setting SCORM *_objAPI accessors:', e);
            // Absolute fallback: direct assignment (original behavior)
            window.SCORM2004_objAPI = api;
            window.SCORM_objAPI = api;
        }
        
        // Also inject into parent and top (for nested iframes)
        // But only if they're same-origin (which they should be since wrapper is same-origin)
        try {
            if (window.parent && window.parent !== window) {
                try {
                    window.parent.API = api;
                    window.parent.API_1484_11 = api;
                } catch (e) {
                    // Cross-origin - that's okay, parent is React app (localhost:3000)
                    // We can't set it, but that's fine since API is in current window
                }
            }
        } catch (e) {
            // Ignore
        }
        
        try {
            if (window.top && window.top !== window) {
                try {
                    window.top.API = api;
                    window.top.API_1484_11 = api;
                } catch (e) {
                    // Cross-origin - that's okay
                }
            }
        } catch (e) {
            // Ignore
        }
        
        // Fix window.open access issues - proxy window.open to allow proper access
        // Some SCORM content tries to access window.parent.open or window.top.open
        // We need to provide safe wrappers that handle cross-origin gracefully
        try {
            // Store original window.open
            const originalOpen = window.open || function(url, name, features) {
                // Fallback: try to open in current window if parent/top fails
                try {
                    return window.open(url, name, features);
                } catch (e) {
                    console.warn('window.open failed:', e);
                    return null;
                }
            };
            
            // Create a safe wrapper for window.open that handles cross-origin
            const safeOpen = function(url, name, features) {
                try {
                    return originalOpen.call(window, url, name, features);
                } catch (e) {
                    console.warn('window.open call failed:', e);
                    // Fallback: try alert instead
                    if (url && typeof url === 'string') {
                        console.log('Would open:', url);
                    }
                    return null;
                }
            };
            
            // Override window.open with safe wrapper
            window.open = safeOpen;
            
            // Also ensure parent and top have safe open wrappers if accessible
            if (window.parent && window.parent !== window) {
                try {
                    // Try to access parent.open first to see if it's accessible
                    const parentOpen = window.parent.open;
                    if (parentOpen) {
                        // Parent.open exists and is accessible, use it
                        window.parent.open = function(url, name, features) {
                            try {
                                return parentOpen.call(window.parent, url, name, features);
                            } catch (e) {
                                // Fallback to current window
                                return safeOpen(url, name, features);
                            }
                        };
                    } else {
                        // Parent.open doesn't exist, set our safe wrapper
                        window.parent.open = safeOpen;
                    }
                } catch (e) {
                    // Cross-origin - can't access or set parent.open
                    // This is expected and okay
                    console.warn('Cannot access window.parent.open (cross-origin):', e.message);
                }
            }
            
            if (window.top && window.top !== window) {
                try {
                    // Try to access top.open first
                    const topOpen = window.top.open;
                    if (topOpen) {
                        window.top.open = function(url, name, features) {
                            try {
                                return topOpen.call(window.top, url, name, features);
                            } catch (e) {
                                // Fallback to current window
                                return safeOpen(url, name, features);
                            }
                        };
                    } else {
                        window.top.open = safeOpen;
                    }
                } catch (e) {
                    // Cross-origin - can't access or set top.open
                    console.warn('Cannot access window.top.open (cross-origin):', e.message);
                }
            }
            
            // Override DisplayError function if it exists to prevent cross-origin errors
            // This function is often used by SCORM content to show error dialogs
            if (typeof window.DisplayError === 'function') {
                const originalDisplayError = window.DisplayError;
                window.DisplayError = function(message) {
                    try {
                        // Try original function first
                        return originalDisplayError.call(window, message);
                    } catch (e) {
                        // If it fails due to cross-origin, use console and alert instead
                        console.error('SCORM Error:', message);
                        try {
                            // Suppressed alert - just log to console
                            console.error('[SCORM]', message);
                        } catch (alertErr) {
                            // Even alert might fail, just log it
                            console.error('Could not display error dialog:', message);
                        }
                    }
                };
            }
            
            // Also override InitializeExecuted if it exists (common SCORM function)
            if (typeof window.InitializeExecuted === 'function') {
                const originalInitializeExecuted = window.InitializeExecuted;
                window.InitializeExecuted = function(success, message) {
                    try {
                        return originalInitializeExecuted.call(window, success, message);
                    } catch (e) {
                        // If it fails, log and continue
                        console.log('SCORM Initialize:', success ? 'Success' : 'Failed', message || '');
                        if (!success && message) {
                            console.error('SCORM Init Error:', message);
                        }
                    }
                };
            }
        } catch (e) {
            console.warn('Could not set up window.open proxy:', e);
        }
        
        // Track if last video has been detected
        // lastVideoInfo is passed from server-side
        let lastVideoDetected = false;
        let lastVideoWatchRecorded = false;
        
        // Start progress monitoring
        let progressInterval = setInterval(() => {
            try {
                if (api && api.initialized) {
                    const status = api.LMSGetValue('cmi.core.lesson_status');
                    const score = api.LMSGetValue('cmi.core.score.raw');
                    const time = api.LMSGetValue('cmi.core.total_time');
                    const exit = api.LMSGetValue('cmi.core.exit');
                    const lessonLocation = api.LMSGetValue('cmi.core.lesson_location');
                    const suspendData = api.LMSGetValue('cmi.suspend_data');
                    
                    // PHASE 1: Parse time spent to seconds (with fallback to session time)
                    const timeSpentSeconds = api.parseTimeToSeconds(time);
                    api.progressData.timeSpent = timeSpentSeconds;
                    
                    // PHASE 1: Log time tracking for debugging
                    if (timeSpentSeconds > 0 && timeSpentSeconds % 30 === 0) {
                        console.log('[SCORM Progress] Time tracking - SCORM time:', time || '(not set)', 'Session time:', timeSpentSeconds + 's');
                    }
                    
                    let isCompleted = status === 'completed' || status === 'passed';
                    if (exit && exit !== '' && exit !== 'normal') {
                        isCompleted = true;
                    }
                    
                    // Detect if SCORM has reached the last slide
                    let isLastSlide = isCompleted;
                    if (exit && exit !== '' && exit !== 'normal') {
                        isLastSlide = true;
                    }
                    if (lessonLocation && (
                        lessonLocation.includes('final') || 
                        lessonLocation.includes('end') ||
                        lessonLocation.includes('complete') ||
                        lessonLocation.includes('last')
                    )) {
                        isLastSlide = true;
                    }
                    if (suspendData && (
                        suspendData.includes('completed') ||
                        suspendData.includes('finished') ||
                        suspendData.includes('end') ||
                        suspendData.includes('final')
                    )) {
                        isLastSlide = true;
                    }
                    
                    // Detect if last video is playing
                    let isLastVideoPlaying = false;
                    let isScormEnded = false;
                    
                    if (lastVideoInfo && !lastVideoWatchRecorded) {
                        const lastVideoFilename = lastVideoInfo.filename;
                        const lastVideoNameWithoutExt = lastVideoFilename.replace(/\.(mp4|webm|mov)$/i, '');
                        
                        // Check multiple ways the video might be referenced
                        const checks = [
                            lessonLocation && lessonLocation.includes(lastVideoFilename),
                            lessonLocation && lessonLocation.includes(lastVideoNameWithoutExt),
                            lessonLocation && lessonLocation.includes('vr/' + lastVideoFilename),
                            suspendData && suspendData.includes(lastVideoFilename),
                            suspendData && suspendData.includes(lastVideoNameWithoutExt),
                            suspendData && suspendData.includes('vr/' + lastVideoFilename),
                        ];
                        
                        // Also check current URL
                        try {
                            const currentUrl = window.location.href || '';
                            const currentPath = window.location.pathname || '';
                            checks.push(
                                currentUrl.includes(lastVideoFilename),
                                currentUrl.includes(lastVideoNameWithoutExt),
                                currentPath.includes(lastVideoFilename),
                                currentPath.includes(lastVideoNameWithoutExt)
                            );
                        } catch (e) {
                            // Can't access URL
                        }
                        
                        isLastVideoPlaying = checks.some(check => check === true);
                        
                        // Detect if SCORM has fully ended (reached final image and stopped)
                        // This happens when:
                        // 1. Status is "completed" or "passed" (content finished)
                        // 2. Exit is set (user reached the end)
                        // 3. Last video was detected AND status is completed
                        isScormEnded = isCompleted || 
                                      (exit && exit !== '' && exit !== 'normal') ||
                                      (isLastVideoPlaying && (status === 'completed' || status === 'passed'));
                        
                        // Debug logging (only once per state change)
                        if (!lastVideoDetected && lastVideoInfo) {
                            console.log('[SCORM Debug] Checking for last video:', {
                                filename: lastVideoFilename,
                                lessonLocation: lessonLocation || '(empty)',
                                suspendData: suspendData ? suspendData.substring(0, 50) + '...' : '(empty)',
                                status: status,
                                exit: exit,
                                isCompleted: isCompleted,
                                checks: checks,
                                isLastVideoPlaying: isLastVideoPlaying,
                                isScormEnded: isScormEnded
                            });
                        }
                        
                        // Detect when last video starts playing
                        if (isLastVideoPlaying && !lastVideoDetected) {
                            lastVideoDetected = true;
                            // PHASE 1: Update API progress tracking
                            api.progressData.lastVideoReached = true;
                            const maxScore = api.LMSGetValue('cmi.core.score.max');
                            const parsedMaxScore = maxScore && maxScore !== '' ? parseFloat(maxScore) : null;
                            console.log('[SCORM] ✅ Last video detected as playing:', lastVideoFilename);
                            console.log('[SCORM Progress] Last video reached - Progress:', api.progressData.currentProgress + '%', 
                                       'Time:', api.progressData.timeSpent + 's', 
                                       'Score:', api.progressData.lastScore,
                                       'Max score:', parsedMaxScore !== null ? parsedMaxScore : 'N/A');
                            // Save immediately via commit to ensure lastVideoReached is stored
                            api.LMSCommit('');
                        }
                        
                        // Detect when SCORM has fully ended (final image shown, everything stopped)
                        if (isScormEnded && !api.progressData.finalImageReached) {
                            // PHASE 1: Update API progress tracking (for logging only)
                            api.progressData.finalImageReached = true;
                            console.log('[SCORM] ✅ SCORM flow ended! Final image reached.');
                            const maxScore = api.LMSGetValue('cmi.core.score.max');
                            const parsedMaxScore = maxScore && maxScore !== '' ? parseFloat(maxScore) : null;
                            console.log('[SCORM Progress] Final image reached - Progress:', api.progressData.currentProgress + '%', 
                                       'Time:', api.progressData.timeSpent + 's', 
                                       'Score:', api.progressData.lastScore,
                                       'Max score:', parsedMaxScore !== null ? parsedMaxScore : 'N/A',
                                       'Last video:', api.progressData.lastVideoReached);
                            // NOTE: User must click "Done" button to trigger completion check
                            // No automatic recording here
                        }
                    } else if (!lastVideoInfo) {
                        // If no last video info, still check if SCORM ended
                        isScormEnded = isCompleted || (exit && exit !== '' && exit !== 'normal');
                    }
                    
                    // PHASE 1: Calculate progress AFTER all flags are determined
                    const calculatedProgress = api.calculateProgress(
                        lessonLocation,
                        timeSpentSeconds,
                        isLastVideoPlaying || api.progressData.lastVideoReached,
                        isScormEnded || api.progressData.finalImageReached
                    );
                    api.progressData.currentProgress = calculatedProgress;
                    
                    // PHASE 1: Log progress periodically (every 10 seconds to avoid spam)
                    if (Math.floor(timeSpentSeconds) % 10 === 0 && timeSpentSeconds > 0) {
                        console.log('[SCORM Progress] Current progress:', calculatedProgress.toFixed(1) + '%', 
                                   'Time:', timeSpentSeconds + 's', 
                                   'Score:', parsedScore !== null ? parsedScore : 'N/A',
                                   'Max score:', parsedMaxScore !== null ? parsedMaxScore : 'N/A',
                                   'Last video:', api.progressData.lastVideoReached,
                                   'Final image:', api.progressData.finalImageReached);
                    }
                    
                    // PHASE 1: Format time for display (convert seconds to HH:MM:SS.SS)
                    const formatTime = function(seconds) {
                        const hours = Math.floor(seconds / 3600);
                        const minutes = Math.floor((seconds % 3600) / 60);
                        const secs = (seconds % 60).toFixed(2);
                        const hoursStr = String(hours).padStart(2, '0');
                        const minutesStr = String(minutes).padStart(2, '0');
                        const secsStr = String(secs).padStart(2, '0');
                        return hoursStr + ':' + minutesStr + ':' + secsStr;
                    };
                    
                    // PHASE 1: Parse score safely (handle empty/invalid values)
                    let parsedScore = null;
                    let parsedMaxScore = null;
                    if (score && score !== '' && score !== 'undefined' && score !== 'null') {
                        const scoreNum = parseFloat(score);
                        if (!isNaN(scoreNum)) {
                            parsedScore = scoreNum;
                        }
                    }
                    // Get max score for logging
                    const maxScore = api.LMSGetValue('cmi.core.score.max');
                    if (maxScore && maxScore !== '' && maxScore !== 'undefined' && maxScore !== 'null') {
                        const maxScoreNum = parseFloat(maxScore);
                        if (!isNaN(maxScoreNum)) {
                            parsedMaxScore = maxScoreNum;
                        }
                    }
                    
                    // Send progress update to parent window
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({
                            type: 'SCORM_PROGRESS',
                            data: {
                                status: status || 'not attempted',
                                score: parsedScore, // Use safely parsed score
                                scoreMax: parsedMaxScore, // Include max score
                                timeSpent: time && time !== '00:00:00.00' ? time : formatTime(timeSpentSeconds), // Use session time if SCORM time is empty
                                exit: exit || '',
                                lessonLocation: lessonLocation || '',
                                suspendData: suspendData || '',
                                isCompleted: isCompleted,
                                isLastSlide: isLastSlide,
                                isLastVideoPlaying: isLastVideoPlaying, // Indicates if last video is playing
                                isScormEnded: isScormEnded, // New: indicates if SCORM flow has fully ended (final image reached)
                                lastVideoFilename: lastVideoInfo ? lastVideoInfo.filename : null,
                                // PHASE 1: Include progress data
                                progress: calculatedProgress,
                                timeSpentSeconds: timeSpentSeconds,
                            }
                        }, '*');
                    }
                }
            } catch (err) {
                console.error('Error monitoring SCORM progress:', err);
            }
        }, 2000);
        
        // Store interval for cleanup
        window.scormProgressInterval = progressInterval;
        
        // Listen for messages from parent
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'SCORM_SAVE') {
                if (api && api.initialized) {
                    api.LMSCommit('');
                }
            } else if (event.data && event.data.type === 'SCORM_FINISH') {
                if (api && api.initialized) {
                    api.LMSCommit('');
                    api.LMSFinish('');
                }
                if (window.scormProgressInterval) {
                    clearInterval(window.scormProgressInterval);
                }
            }
        });
    })();
    </script>
    `;
    
    // Add <base> tag to fix relative URL resolution
    // This ensures all relative paths (including those loaded by JavaScript) resolve correctly
    const baseTag = `<base href="${baseUrl}${scormBasePath}/">`;
    
    // Inject base tag and API script at the very beginning of <head> tag (BEFORE any other scripts)
    // This ensures API is available when scormdriver.js loads and relative URLs resolve correctly
    scormHtml = scormHtml.replace(/<head[^>]*>/i, (match) => {
        return match + baseTag + apiScript;
    });
    
    // If no <head> tag found, inject at the very beginning
    if (!scormHtml.includes(apiScript)) {
        scormHtml = baseTag + apiScript + scormHtml;
    }
    
    // Note: scormBasePath is already defined above
    // The <base> tag handles most relative URLs, but we still process HTML attributes
    
    // Split HTML into parts: HTML tags and JavaScript code
    // We only want to rewrite URLs in HTML attributes, not in JavaScript
    const parts = [];
    let lastIndex = 0;
    
    // Find all <script>...</script> blocks to preserve JavaScript
    const scriptBlockRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    
    while ((match = scriptBlockRegex.exec(scormHtml)) !== null) {
        // Add HTML before script
        if (match.index > lastIndex) {
            parts.push({ type: 'html', content: scormHtml.substring(lastIndex, match.index) });
        }
        // Add script block (preserve as-is)
        parts.push({ type: 'script', content: match[0] });
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining HTML after last script
    if (lastIndex < scormHtml.length) {
        parts.push({ type: 'html', content: scormHtml.substring(lastIndex) });
    }
    
    // If no scripts found, treat entire content as HTML
    if (parts.length === 0) {
        parts.push({ type: 'html', content: scormHtml });
    }
    
    // Process each part
    const processedParts = parts.map(part => {
        if (part.type === 'script') {
            // Don't modify JavaScript code - return as-is
            return part.content;
        } else {
            // Process HTML: rewrite relative URLs in attributes only
            let html = part.content;
            
            // Rewrite relative URLs in src and href attributes of HTML tags
            // Only match when src/href is an HTML attribute (after <tag or whitespace)
            html = html.replace(
                /<(\w+)[^>]*\s+(src|href)=(["'])([^"']+\.(js|css|gif|png|jpg|jpeg|svg|json|mp3|mp4|wav|ogg|woff|woff2|ttf|eot))\3/gi,
                (match, tag, attr, quote, url) => {
                    // Skip if already absolute URL (http://, https://, //, /)
                    if (/^(https?:|\/\/|\/)/.test(url)) {
                        return match;
                    }
                    // Rewrite relative URLs to use static file endpoint
                    const cleanUrl = url.replace(/^\.\//, '');
                    const absoluteUrl = `${baseUrl}${scormBasePath}/${cleanUrl}`;
                    return match.replace(`${attr}=${quote}${url}${quote}`, `${attr}=${quote}${absoluteUrl}${quote}`);
                }
            );
            
            // Fix CSS url() in style attributes
            html = html.replace(
                /style\s*=\s*(["'])([^"']*url\(["']?)([^"')]+\.(gif|png|jpg|jpeg|svg|woff|woff2|ttf|eot))(["']?\))/gi,
                (match, quote, prefix, url, ext, suffix) => {
                    // Skip if already absolute URL
                    if (/^(https?:|\/\/|\/)/.test(url)) {
                        return match;
                    }
                    // Rewrite relative URLs
                    const cleanUrl = url.replace(/^\.\//, '');
                    const absoluteUrl = `${baseUrl}${scormBasePath}/${cleanUrl}`;
                    return match.replace(`url(${suffix ? '"' : ''}${url}${suffix ? '"' : ''})`, `url("${absoluteUrl}")`);
                }
            );
            
            // Fix CSS url() in <style> tags (but not in JavaScript)
            html = html.replace(
                /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
                (match, openTag, styleContent, closeTag) => {
                    // Process url() in style content
                    const processedStyle = styleContent.replace(
                        /url\(["']?([^"')]+\.(gif|png|jpg|jpeg|svg|woff|woff2|ttf|eot))["']?\)/gi,
                        (urlMatch, url) => {
                            // Skip if already absolute URL
                            if (/^(https?:|\/\/|\/)/.test(url)) {
                                return urlMatch;
                            }
                            // Rewrite relative URLs
                            const cleanUrl = url.replace(/^\.\//, '');
                            const absoluteUrl = `${baseUrl}${scormBasePath}/${cleanUrl}`;
                            return `url("${absoluteUrl}")`;
                        }
                    );
                    return `${openTag}${processedStyle}${closeTag}`;
                }
            );
            
            return html;
        }
    });
    
    // Reconstruct HTML
    scormHtml = processedParts.join('');
    
    // Serve the modified HTML with API pre-injected and asset URLs fixed
    res.setHeader('Content-Type', 'text/html');
    res.send(scormHtml);
  } catch (error) {
    console.error('Error getting SCORM wrapper:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get SCORM wrapper',
    });
  }
};

/**
 * @desc    Check if SCORM completion requirements are met
 * @route   POST /api/scorm/:contentId/check-completion
 * @access  Private
 * 
 * Request body:
 * {
 *   "contentType": "book"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "canComplete": true/false,
 *   "message": "Completion requirements met" or reason why not,
 *   "data": {
 *     "timeSpent": 120,
 *     "estimatedMinTime": 60,
 *     "currentProgress": 85,
 *     "lastVideoReached": true,
 *     "score": 100,
 *     "status": "passed"
 *   }
 * }
 */
const checkCompletion = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { contentType } = req.body;
    const userId = req.user._id;
    
    if (!contentType || contentType !== 'book') {
      return res.status(400).json({
        success: false,
        message: 'Invalid contentType. Must be "book"',
      });
    }
    
    // Get child profile
    const child = await ChildProfile.findOne({ parent: userId });
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child profile not found',
      });
    }
    
    // Get course that contains this content
    const course = await Course.findOne({
      'contents.contentId': contentId,
      'contents.contentType': contentType,
    });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }
    
    // Get current SCORM progress from CourseProgress
    const progress = await CourseProgress.findOne({
      child: child._id,
      course: course._id,
    });
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Progress not found',
      });
    }
    
    const contentProgressItem = progress.contentProgress.find(
      item => item.contentId.toString() === contentId.toString() &&
              item.contentType === contentType
    );
    
    if (!contentProgressItem) {
      return res.status(404).json({
        success: false,
        message: 'Content progress not found',
      });
    }
    
    const scormProgress = contentProgressItem.scormProgress || {};
    const timeSpentStr = scormProgress.timeSpent || '00:00:00.00';
    const timeSpentSeconds = parseTimeToSeconds(timeSpentStr);
    const estimatedMinTime = 60; // 60 seconds minimum
    const lessonLocation = scormProgress.lessonLocation || '';
    const currentProgress = calculateProgressFromLocation(lessonLocation);
    const lastVideoReached = scormProgress.lastVideoReached || false;
    const score = scormProgress.score?.raw || null;
    const scoreMax = scormProgress.score?.max || null;
    const scoreMin = scormProgress.score?.min || null;
    const status = scormProgress.lessonStatus || 'not attempted';
    
    // Log completion check attempt
    console.log('[SCORM Completion Check] Time:', timeSpentSeconds + 's', 
               'Estimated:', estimatedMinTime + 's', 
               'Progress:', currentProgress + '%', 
               'Last video:', lastVideoReached,
               'Score:', score,
               'Max score:', scoreMax !== null ? scoreMax : 'N/A',
               'Min score:', scoreMin !== null ? scoreMin : 'N/A',
               'Status:', status);
    
    // Validation rules:
    // 1. Time must be >= estimated minimum (60 seconds) OR score equals max score
    // 2. AND (lastVideoReached OR progress >= 80% OR score equals max score)
    // 3. Score and status are checked but not required for completion
    
    // Check if score equals max score (allows early completion)
    const scoreEqualsMax = score !== null && scoreMax !== null && score === scoreMax;
    
    const canComplete = 
      (timeSpentSeconds >= estimatedMinTime || scoreEqualsMax) &&
      (lastVideoReached || currentProgress >= 80 || scoreEqualsMax);
    
    let message = '';
    if (!canComplete) {
      if (timeSpentSeconds < estimatedMinTime && !scoreEqualsMax) {
        message = `Please spend at least ${estimatedMinTime} seconds reading. Current time: ${timeSpentSeconds}s`;
      } else if (!lastVideoReached && currentProgress < 80 && !scoreEqualsMax) {
        message = `Please read more of the book. Current progress: ${currentProgress.toFixed(1)}%`;
      }
    } else {
      if (scoreEqualsMax) {
        message = 'Maximum score reached! Completion requirements met!';
      } else {
        message = 'Completion requirements met!';
      }
    }
    
    // If validation passes, record the completion
    if (canComplete) {
      // Check if already completed
      if (contentProgressItem.scormProgress?.completion?.lastVideoWatchRecorded) {
        // Already completed
        const childStats = await ChildStats.getOrCreate(child._id);
        return res.json({
          success: true,
          canComplete: true,
          message: 'Completion already recorded',
          data: {
            starsAwarded: false,
            starsToAward: 0,
            totalStars: childStats.totalStars,
            alreadyCompleted: true,
        timeSpent: timeSpentSeconds,
        estimatedMinTime,
        currentProgress,
        lastVideoReached,
        score,
        scoreMax,
        scoreMin,
        status,
      },
    });
      }
      
      // Record completion - reuse logic from recordLastVideoWatch
      try {
        const book = await Book.findById(contentId);
        if (!book) {
          return res.status(404).json({
            success: false,
            canComplete: false,
            message: 'Book not found',
          });
        }
        
        const childStats = await ChildStats.getOrCreate(child._id);
        const requiredWatchCount = book.requiredWatchCount || 5;
        const starsToAward = book.starsAwarded || 10;
        
        // Check if stars have already been awarded
        const existingEarning = await StarEarning.findOne({
          child: child._id,
          'source.type': 'book',
          'source.contentId': contentId,
        });
        
        const starsAlreadyAwarded = !!existingEarning;
        
        if (!starsAlreadyAwarded) {
          // Award stars for completing the book
          await StarEarning.create({
            child: child._id,
            stars: starsToAward,
            source: {
              type: 'book',
              contentId: contentId,
              contentType: 'Book',
              metadata: {
                bookTitle: book.title,
                requiredWatchCount,
              },
            },
            description: `Earned ${starsToAward} stars for completing "${book.title}"`,
          });
          
          // Update ChildStats to accumulate total stars
          await childStats.addStars(starsToAward);
          await childStats.save();
          
          console.log(`[SCORM] Stars awarded: ${starsToAward} stars added to child ${child._id} for book ${contentId}`);
        }
        
        // Mark completion as recorded in CourseProgress
        if (!contentProgressItem.scormProgress.completion) {
          contentProgressItem.scormProgress.completion = {};
        }
        contentProgressItem.scormProgress.completion.lastVideoWatchRecorded = true;
        contentProgressItem.scormProgress.completion.completedAt = new Date();
        await progress.save();
        
        // Get reading count (using BookReading model if available)
        let readingCount = 0;
        try {
          const BookReading = require('../models/BookReading');
          readingCount = await BookReading.getCompletedReadingCount(child._id, contentId);
        } catch (err) {
          // BookReading model might not exist, use default
          readingCount = 1;
        }
        
        return res.json({
          success: true,
          canComplete: true,
          message: 'Completion recorded successfully',
          data: {
            starsAwarded: !starsAlreadyAwarded,
            starsToAward: starsAlreadyAwarded ? 0 : starsToAward,
            totalStars: childStats.totalStars,
            readingCount: readingCount + 1,
            requiredReadingCount: requiredWatchCount,
            timeSpent: timeSpentSeconds,
            estimatedMinTime,
            currentProgress,
            lastVideoReached,
            score,
            scoreMax,
            scoreMin,
            status,
          },
        });
      } catch (err) {
        console.error('Error recording completion:', err);
        return res.status(500).json({
          success: false,
          canComplete: false,
          message: 'Completion validated but failed to record: ' + err.message,
        });
      }
    }
    
    // Validation failed - return error message
    return res.json({
      success: true,
      canComplete: false,
      message,
      data: {
        timeSpent: timeSpentSeconds,
        estimatedMinTime,
        currentProgress,
        lastVideoReached,
        score,
        scoreMax,
        scoreMin,
        status,
      },
    });
  } catch (error) {
    console.error('Error checking completion:', error);
    res.status(500).json({
      success: false,
      canComplete: false,
      message: error.message || 'Failed to check completion',
    });
  }
};

/**
 * @desc    Record last video watch for SCORM book
 * @route   POST /api/scorm/:contentId/record-last-video-watch
 * @access  Private
 * 
 * Request body:
 * {
 *   "contentType": "book"
 * }
 */
const recordLastVideoWatch = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { contentType } = req.body;
    const userId = req.user._id;
    
    if (!contentType || contentType !== 'book') {
      return res.status(400).json({
        success: false,
        message: 'Invalid contentType. Must be "book"',
      });
    }
    
    // Get the book
    const book = await Book.findById(contentId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }
    
    // Get child profile
    const child = await ChildProfile.findOne({ parent: userId });
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child profile not found',
      });
    }
    
    // Get or create child stats
    const childStats = await ChildStats.getOrCreate(child._id);
    
    // Get required watch count (default 5 for books)
    const requiredWatchCount = book.requiredWatchCount || 5;
    const starsToAward = book.starsAwarded || 10;
    
    // Check if stars have already been awarded for this book
    const existingEarning = await StarEarning.findOne({
      child: child._id,
      'source.type': 'book',
      'source.contentId': contentId,
    });
    
    const starsAlreadyAwarded = !!existingEarning;
    
    if (!starsAlreadyAwarded) {
      // Award stars for completing the book (watching last video)
      await StarEarning.create({
        child: child._id,
        stars: starsToAward,
        source: {
          type: 'book',
          contentId: contentId,
          contentType: 'Book',
          metadata: {
            bookTitle: book.title,
            requiredWatchCount,
          },
        },
        description: `Earned ${starsToAward} stars for completing "${book.title}"`,
      });
      
      // Update ChildStats to accumulate total stars
      await childStats.addStars(starsToAward);
      await childStats.save();
      
      console.log(`[SCORM] Stars awarded: ${starsToAward} stars added to child ${child._id} for book ${contentId}`);
    }
    
    res.json({
      success: true,
      message: 'Last video watch recorded',
      data: {
        starsAwarded: !starsAlreadyAwarded,
        starsToAward: starsAlreadyAwarded ? 0 : starsToAward,
        totalStars: childStats.totalStars,
      },
    });
  } catch (error) {
    console.error('Error recording last video watch:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to record last video watch',
    });
  }
};

module.exports = {
  getLaunchUrl,
  saveProgress,
  getProgress,
  getWrapper,
  recordLastVideoWatch,
  checkCompletion,
};
