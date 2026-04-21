const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { uploadProgramPrintable } = require('../middleware/upload');
const {
  listModules,
  listCoursePrintables,
  getCoursePrintableById,
  uploadModulePrintable,
  updateCoursePrintable,
  deleteCoursePrintable,
  uploadFullBundle,
  uploadRecipes,
} = require('../controllers/programMaterialsAdmin.controller');

// Parent/admin must be authenticated
router.use(protect);

// Only admin/teacher can manage PDFs
router.use(authorize('admin', 'teacher'));

// List module steps and their printable upload state
router.get('/modules', listModules);

// List printable materials inside a specific module/course
router.get('/modules/:courseId/printables', listCoursePrintables);
router.get('/modules/:courseId/printables/:printableId', getCoursePrintableById);

// Upload/replace module printable (PDF + optional cover)
router.post('/modules/:courseId/printables', uploadProgramPrintable, uploadModulePrintable);
// Backward compatibility alias
router.post('/modules/:courseId/printable', uploadProgramPrintable, uploadModulePrintable);
router.put('/modules/:courseId/printables/:printableId', uploadProgramPrintable, updateCoursePrintable);
router.delete('/modules/:courseId/printables/:printableId', deleteCoursePrintable);

// Upload/replace full bundle
router.post('/full-bundle', uploadProgramPrintable, uploadFullBundle);

// Upload/replace recipes
router.post('/recipes', uploadProgramPrintable, uploadRecipes);

module.exports = router;

