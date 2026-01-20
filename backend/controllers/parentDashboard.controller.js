const parentDashboardService = require('../services/parentDashboard.services');
const ChildProfile = require('../models/ChildProfile');
const fs = require('fs');
const logPath = 'd:\\UPWORK\\RiseUpKids\\.cursor\\debug.log';

/**
 * @desc    Get child progress summary
 * @route   GET /api/parent-dashboard/child/:childId/progress
 * @access  Private (Parent/Admin)
 */
const getChildProgress = async (req, res) => {
  try {
    const { childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const progressData = await parentDashboardService.getChildProgress(childId);
    
    // Ensure starSources is always an array
    if (!Array.isArray(progressData.starSources)) {
      progressData.starSources = [];
    }
    
    console.log(`[ParentDashboard Controller] Returning progress data with ${progressData.starSources?.length || 0} star sources`);

    res.status(200).json({
      success: true,
      data: progressData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get child progress',
    });
  }
};

// #region agent log
try {
  const logData = {location:'parentDashboard.controller.js:44',message:'Before module.exports',data:{getChildProgressType:typeof getChildProgress,isFunction:typeof getChildProgress === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
  fs.appendFileSync(logPath, JSON.stringify(logData) + '\n');
} catch(e) {}
// #endregion

const exportsObj = {
  getChildProgress,
};

// #region agent log
try {
  const logData = {location:'parentDashboard.controller.js:47',message:'Export object created',data:{exportsKeys:Object.keys(exportsObj),hasGetChildProgress:!!exportsObj.getChildProgress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
  fs.appendFileSync(logPath, JSON.stringify(logData) + '\n');
} catch(e) {}
// #endregion

module.exports = exportsObj;
