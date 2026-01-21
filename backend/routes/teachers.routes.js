const express = require('express');
const router = express.Router();
const {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  archiveTeacher,
  restoreTeacher,
} = require('../controllers/teachers.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Teachers Routes
 *
 * Base path: /api/teachers
 *
 * All routes require authentication and admin role.
 * Teacher accounts can ONLY be created/managed by admins.
 */

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);
router.post('/', createTeacher);
router.put('/:id', updateTeacher);
router.delete('/:id', archiveTeacher);
router.put('/:id/restore', restoreTeacher);

module.exports = router;

