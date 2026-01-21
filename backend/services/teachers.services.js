const { User } = require('../models');

/**
 * Teachers Service
 *
 * Teacher accounts are stored in the User collection with role = 'teacher'.
 * IMPORTANT: Teacher accounts can only be created by an admin.
 */

const getAllTeachers = async (queryParams = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams;

  const query = { role: 'teacher' };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [teachers, total] = await Promise.all([
    User.find(query).select('-password').sort(sort).skip(skip).limit(limitNum).lean(),
    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    teachers,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

const getTeacherById = async (teacherId) => {
  const teacher = await User.findById(teacherId).select('-password').lean();

  if (!teacher) {
    throw new Error('Teacher not found');
  }

  if (teacher.role !== 'teacher') {
    throw new Error('User is not a teacher');
  }

  return teacher;
};

const createTeacher = async (teacherData) => {
  const { name, email, password } = teacherData;

  if (!name || !email || !password) {
    throw new Error('Please provide name, email, and password');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  const teacher = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'teacher',
    isActive: true,
  });

  return await User.findById(teacher._id).select('-password');
};

const updateTeacher = async (teacherId, updateData) => {
  const { name, email, isActive } = updateData;

  const teacher = await User.findById(teacherId);
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  if (teacher.role !== 'teacher') {
    throw new Error('User is not a teacher');
  }

  if (name !== undefined) {
    teacher.name = name;
  }

  if (email !== undefined) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== teacherId.toString()) {
      throw new Error('Email already in use');
    }
    teacher.email = email.toLowerCase();
  }

  if (isActive !== undefined) {
    teacher.isActive = isActive;
  }

  await teacher.save();

  return await User.findById(teacherId).select('-password');
};

const archiveTeacher = async (teacherId) => {
  const teacher = await User.findById(teacherId);
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  if (teacher.role !== 'teacher') {
    throw new Error('User is not a teacher');
  }

  teacher.isActive = false;
  await teacher.save();

  return await User.findById(teacherId).select('-password');
};

const restoreTeacher = async (teacherId) => {
  const teacher = await User.findById(teacherId);
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  if (teacher.role !== 'teacher') {
    throw new Error('User is not a teacher');
  }

  teacher.isActive = true;
  await teacher.save();

  return await User.findById(teacherId).select('-password');
};

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  archiveTeacher,
  restoreTeacher,
};

