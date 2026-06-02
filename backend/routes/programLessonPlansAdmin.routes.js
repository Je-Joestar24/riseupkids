const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { uploadProgramPrintable } = require('../middleware/upload');
const {
  listModules,
  listCourseLessonPlans,
  getCourseLessonPlanById,
  uploadModuleLessonPlan,
  updateCourseLessonPlan,
  deleteCourseLessonPlan,
} = require('../controllers/programLessonPlansAdmin.controller');

router.use(protect);
router.use(authorize('admin', 'teacher'));

router.get('/modules', listModules);
router.get('/modules/:courseId/lesson-plans', listCourseLessonPlans);
router.get('/modules/:courseId/lesson-plans/:lessonPlanId', getCourseLessonPlanById);
router.post('/modules/:courseId/lesson-plans', uploadProgramPrintable, uploadModuleLessonPlan);
router.put('/modules/:courseId/lesson-plans/:lessonPlanId', uploadProgramPrintable, updateCourseLessonPlan);
router.delete('/modules/:courseId/lesson-plans/:lessonPlanId', deleteCourseLessonPlan);

module.exports = router;
