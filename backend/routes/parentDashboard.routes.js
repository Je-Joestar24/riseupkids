const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const fs = require('fs');
const logPath = 'd:\\UPWORK\\RiseUpKids\\.cursor\\debug.log';

// #region agent log
try {
  const logData = {location:'parentDashboard.routes.js:7',message:'Loading controller module',data:{path:'../controllers/parentDashboard.controller'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
  fs.appendFileSync(logPath, JSON.stringify(logData) + '\n');
} catch(e) {}
// #endregion

const controllerModule = require('../controllers/parentDashboard.controller');

// #region agent log
try {
  const logData = {location:'parentDashboard.routes.js:15',message:'Controller module loaded',data:{moduleKeys:Object.keys(controllerModule || {}),hasGetChildProgress:!!controllerModule?.getChildProgress,moduleType:typeof controllerModule},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
  fs.appendFileSync(logPath, JSON.stringify(logData) + '\n');
} catch(e) {}
// #endregion

const { getChildProgress } = controllerModule;

// #region agent log
try {
  const logData = {location:'parentDashboard.routes.js:21',message:'Destructured getChildProgress',data:{getChildProgressType:typeof getChildProgress,isFunction:typeof getChildProgress === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
  fs.appendFileSync(logPath, JSON.stringify(logData) + '\n');
} catch(e) {}
// #endregion

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/parent-dashboard/child/:childId/progress
 * @desc    Get child progress summary for parent dashboard
 * @access  Private (Parent/Admin)
 */

// #region agent log
try {
  const logData = {location:'parentDashboard.routes.js:34',message:'Before router.get call',data:{getChildProgressType:typeof getChildProgress,getChildProgressValue:getChildProgress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
  fs.appendFileSync(logPath, JSON.stringify(logData) + '\n');
} catch(e) {}
// #endregion

router.get('/child/:childId/progress', getChildProgress);

module.exports = router;
