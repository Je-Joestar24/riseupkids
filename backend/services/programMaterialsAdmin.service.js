const { Course, ProgramPrintable } = require('../models');
const s3Service = require('./s3.service');

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

const orderCoursesForModules = (courses) => {
  // Match existing CourseProgress ordering: stepOrder first, then createdAt
  return courses.sort((a, b) => {
    const aOrder = a.stepOrder !== null && a.stepOrder !== undefined;
    const bOrder = b.stepOrder !== null && b.stepOrder !== undefined;
    if (aOrder && bOrder) return a.stepOrder - b.stepOrder;
    if (aOrder && !bOrder) return -1;
    if (!aOrder && bOrder) return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
};

const listModulesWithPrintables = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 10), 100);
  const skip = (safePage - 1) * safeLimit;
  const safeSearch = String(search || '').trim();

  const query = { isPublished: true, isArchived: false };
  if (safeSearch) {
    query.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const total = await Course.countDocuments(query);
  const courses = await Course.find(query)
    .select('_id title description coverImage stepOrder contents createdAt')
    .sort({ stepOrder: 1, createdAt: 1 })
    .skip(skip)
    .limit(safeLimit)
    .lean();

  const orderedCourses = orderCoursesForModules(courses);
  const courseIds = orderedCourses.map((c) => c._id);

  const activePrintables = await ProgramPrintable.find({
    type: 'module',
    isActive: true,
    course: { $in: courseIds },
  })
    .sort({ course: 1, createdAt: 1 })
    .lean();

  const printablesByCourseId = new Map();
  for (const p of activePrintables) {
    const key = String(p.course);
    if (!printablesByCourseId.has(key)) printablesByCourseId.set(key, []);
    printablesByCourseId.get(key).push(p);
  }

  return {
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasNextPage: safePage * safeLimit < total,
      hasPrevPage: safePage > 1,
    },
    courses: orderedCourses.map((c, idx) => {
      const printables = printablesByCourseId.get(String(c._id)) || [];
      return {
        stepNumber: skip + idx + 1,
        id: String(c._id),
        title: c.title,
        description: c.description || null,
        coverImage: c.coverImage || null,
        contentCount: Array.isArray(c.contents) ? c.contents.length : 0,
        printableCount: printables.length,
        latestPrintableAt: printables.length ? printables[printables.length - 1].updatedAt : null,
      };
    }),
  };
};

const uploadModulePrintable = async ({ courseId, userId, title, description, coverImageFile, pdfFile }) => {
  if (!courseId) throw new Error('courseId is required');
  if (!pdfFile) throw new Error('pdfFile is required');
  if (!title) throw new Error('title is required');
  const course = await Course.findOne({ _id: courseId, isPublished: true, isArchived: false }).select('_id');
  if (!course) throw new Error('Course not found');

  // Upload files to S3 first
  const { url: pdfUrl } = await s3Service.uploadFileFromMulter(pdfFile, 'program-materials/printables/pdfs');
  const coverUpload = coverImageFile ? await s3Service.uploadFileFromMulter(coverImageFile, 'program-materials/printables/covers') : null;
  const coverImage = coverUpload ? coverUpload.url : null;

  const printable = await ProgramPrintable.create({
    type: 'module',
    course: courseId,
    title,
    description: description || null,
    coverImage,
    pdfUrl,
    isActive: true,
  });

  return printable;
};

const listCoursePrintables = async ({ courseId, page = 1, limit = 10, search = '' }) => {
  if (!courseId) throw new Error('courseId is required');
  const course = await Course.findOne({ _id: courseId, isPublished: true, isArchived: false })
    .select('_id title description coverImage stepOrder')
    .lean();
  if (!course) throw new Error('Course not found');

  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 10), 100);
  const skip = (safePage - 1) * safeLimit;
  const safeSearch = String(search || '').trim();

  const query = { type: 'module', isActive: true, course: courseId };
  if (safeSearch) {
    query.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const total = await ProgramPrintable.countDocuments(query);
  const printables = await ProgramPrintable.find(query)
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(safeLimit)
    .lean();

  return {
    course: {
      id: String(course._id),
      title: course.title,
      description: course.description || null,
      coverImage: course.coverImage || null,
      stepOrder: course.stepOrder || null,
    },
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasNextPage: safePage * safeLimit < total,
      hasPrevPage: safePage > 1,
    },
    printables: printables.map((p) => ({
      id: String(p._id),
      title: p.title,
      description: p.description || null,
      coverImage: p.coverImage || null,
      pdfUrl: p.pdfUrl,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  };
};

const uploadSinglePrintableAsset = async ({ type, userId, title, description, coverImageFile, pdfFile }) => {
  if (!type || !['recipes', 'full_bundle'].includes(type)) throw new Error('Invalid printable type');
  if (!pdfFile) throw new Error('pdfFile is required');
  if (!title) throw new Error('title is required');

  const { url: pdfUrl } = await s3Service.uploadFileFromMulter(pdfFile, 'program-materials/printables/pdfs');
  const coverUpload = coverImageFile ? await s3Service.uploadFileFromMulter(coverImageFile, 'program-materials/printables/covers') : null;
  const coverImage = coverUpload ? coverUpload.url : null;

  await ProgramPrintable.updateMany({ type, isActive: true }, { $set: { isActive: false } });

  const printable = await ProgramPrintable.create({
    type,
    title,
    description: description || null,
    coverImage,
    pdfUrl,
    isActive: true,
  });

  return printable;
};

const getPrintableAsset = async (type) => {
  const printable = await ProgramPrintable.findOne({ type, isActive: true }).sort({ updatedAt: -1 }).lean();
  if (!printable) return null;
  return {
    id: String(printable._id),
    title: printable.title,
    description: printable.description || null,
    coverImage: printable.coverImage || null,
    pdfUrl: printable.pdfUrl,
    updatedAt: printable.updatedAt,
  };
};

module.exports = {
  listModulesWithPrintables,
  listCoursePrintables,
  uploadModulePrintable,
  uploadSinglePrintableAsset,
  getPrintableAsset,
};

