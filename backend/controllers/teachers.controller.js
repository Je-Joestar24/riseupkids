const teachersService = require('../services/teachers.services');

/**
 * Teachers Controller
 *
 * Admin-only endpoints for managing teacher accounts.
 */

const getAllTeachers = async (req, res) => {
  try {
    const result = await teachersService.getAllTeachers(req.query);
    res.status(200).json({
      success: true,
      message: 'Teachers retrieved successfully',
      data: result.teachers,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve teachers',
    });
  }
};

const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await teachersService.getTeacherById(id);
    res.status(200).json({
      success: true,
      message: 'Teacher retrieved successfully',
      data: teacher,
    });
  } catch (error) {
    const statusCode = error.message === 'Teacher not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve teacher',
    });
  }
};

const createTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const teacher = await teachersService.createTeacher({ name, email, password });
    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: teacher,
    });
  } catch (error) {
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create teacher',
    });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await teachersService.updateTeacher(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      data: teacher,
    });
  } catch (error) {
    const statusCode = error.message === 'Teacher not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update teacher',
    });
  }
};

const archiveTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await teachersService.archiveTeacher(id);
    res.status(200).json({
      success: true,
      message: 'Teacher archived successfully',
      data: teacher,
    });
  } catch (error) {
    const statusCode = error.message === 'Teacher not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to archive teacher',
    });
  }
};

const restoreTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await teachersService.restoreTeacher(id);
    res.status(200).json({
      success: true,
      message: 'Teacher restored successfully',
      data: teacher,
    });
  } catch (error) {
    const statusCode = error.message === 'Teacher not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to restore teacher',
    });
  }
};

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  archiveTeacher,
  restoreTeacher,
};

