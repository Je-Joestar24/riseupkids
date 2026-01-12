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
    
    // Construct launch URL
    // Path relative to uploads directory for serving
    const relativePath = path.relative(
      path.join(__dirname, '../uploads'),
      extractedPath
    );
    
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const launchUrl = `${baseUrl}/scorm/${relativePath.replace(/\\/g, '/')}/${entryPoint}`;
    
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

module.exports = {
  getLaunchUrl,
  saveProgress,
  getProgress,
};
