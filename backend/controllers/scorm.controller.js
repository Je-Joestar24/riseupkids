const scormService = require('../services/scorm.service');
const courseProgressService = require('../services/courseProgress.services');
const AudioAssignment = require('../models/AudioAssignment');
const Chant = require('../models/Chant');
const Book = require('../models/Book');
const Media = require('../models/Media');
const path = require('path');
const fs = require('fs-extra');

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
    
    // Construct launch URL using wrapper endpoint to avoid cross-origin issues
    // The wrapper will inject the SCORM API and serve the content
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
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
        await courseProgressService.updateScormProgress(
          child._id,
          course._id,
          contentId,
          contentType,
          progressData
        );
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
    
    // Construct the actual SCORM content URL
    // scormPath is relative to uploads directory (e.g., "scorm/book/.../extracted")
    // Static files are served from /scorm, so we need to remove "scorm/" prefix if present
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const cleanPath = scormPath.startsWith('scorm/') ? scormPath.replace(/^scorm\//, '') : scormPath;
    const scormContentUrl = `${baseUrl}/scorm/${cleanPath}/${entryPoint}`;
    
    // Get API endpoint for SCORM API script
    const apiBaseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const authToken = token || '';
    
    // Generate wrapper HTML that injects SCORM API
    // This wrapper loads the actual SCORM content and provides the API
    const wrapperHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SCORM Content</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        #scorm-content {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <iframe id="scorm-content" src="${scormContentUrl}" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals" allow="fullscreen"></iframe>
    
    <script>
        // SCORM API Implementation
        // This will be injected into the iframe's window when it loads
        (function() {
            const contentId = '${contentId}';
            const contentType = '${contentType}';
            const userId = '${userId}';
            const apiBaseUrl = '${apiBaseUrl}';
            const authToken = '${authToken}';
            
            // SCORM API class
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
                }
                
                LMSInitialize(parameter = '') {
                    if (this.initialized) {
                        this.errorCode = 101;
                        this.errorString = 'Already initialized';
                        return 'false';
                    }
                    
                    // Load existing progress
                    fetch(apiBaseUrl + '/api/scorm/' + contentId + '/progress?contentType=' + contentType, {
                        headers: {
                            'Authorization': 'Bearer ' + authToken,
                        }
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.data) {
                            // Restore progress data
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
                        this.initialized = true;
                    })
                    .catch(err => {
                        console.error('Failed to load progress:', err);
                        this.initialized = true;
                    });
                    
                    this.errorCode = 0;
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
                    
                    this.data[element] = value;
                    this.hasUncommittedChanges = true;
                    this.errorCode = 0;
                    
                    // Auto-commit after 5 seconds
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
                    
                    // Save progress to backend
                    const progressData = {
                        lessonStatus: this.data['cmi.core.lesson_status'] || 'incomplete',
                        score: this.data['cmi.core.score.raw'] ? parseFloat(this.data['cmi.core.score.raw']) : null,
                        timeSpent: this.data['cmi.core.total_time'] || '00:00:00.00',
                        suspendData: this.data['cmi.suspend_data'] || '',
                        entry: this.data['cmi.core.entry'] || 'ab-initio',
                        exit: this.data['cmi.core.exit'] || 'normal',
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
                    
                    // Final commit
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
            }
            
            // Wait for iframe to load, then inject API
            const iframe = document.getElementById('scorm-content');
            iframe.addEventListener('load', function() {
                try {
                    const iframeWindow = iframe.contentWindow;
                    if (iframeWindow) {
                        const api = new SCORMAPI(contentId, contentType, userId);
                        iframeWindow.API = api;
                        iframeWindow.API_1484_11 = api; // SCORM 2004 compatibility
                        
                        // Initialize
                        api.LMSInitialize('');
                        
                        // Monitor progress and send updates to parent window via postMessage
                        const progressInterval = setInterval(() => {
                            try {
                                if (api && api.initialized) {
                                    const status = api.LMSGetValue('cmi.core.lesson_status');
                                    const score = api.LMSGetValue('cmi.core.score.raw');
                                    const time = api.LMSGetValue('cmi.core.total_time');
                                    
                                    // Send progress update to parent window
                                    window.parent.postMessage({
                                        type: 'SCORM_PROGRESS',
                                        data: {
                                            status: status || 'not attempted',
                                            score: score ? parseFloat(score) : null,
                                            timeSpent: time || '00:00:00.00',
                                            isCompleted: status === 'completed' || status === 'passed',
                                        }
                                    }, '*');
                                }
                            } catch (err) {
                                console.error('Error monitoring SCORM progress:', err);
                            }
                        }, 3000); // Check every 3 seconds
                        
                        // Listen for messages from parent (save, finish)
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
                                clearInterval(progressInterval);
                            }
                        });
                    }
                } catch (err) {
                    console.error('Failed to inject SCORM API:', err);
                }
            });
        })();
    </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(wrapperHTML);
  } catch (error) {
    console.error('Error getting SCORM wrapper:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get SCORM wrapper',
    });
  }
};

module.exports = {
  getLaunchUrl,
  saveProgress,
  getProgress,
  getWrapper,
};
