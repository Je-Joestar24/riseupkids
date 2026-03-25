const { Course, ProgramPrintable } = require('../models');
const s3Service = require('./s3.service');

function parseString(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function parseBoolean(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  if (value === true || value === false) return value;
  return String(value).toLowerCase() === 'true';
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

const listModulesWithPrintables = async () => {
  const courses = await Course.find({ isPublished: true, isArchived: false }).lean();
  const orderedCourses = orderCoursesForModules(courses);

  const courseIds = orderedCourses.map((c) => c._id);
  const activePrintables = await ProgramPrintable.find({
    type: 'module',
    isActive: true,
    course: { $in: courseIds },
  })
    .sort({ course: 1, updatedAt: -1 })
    .lean();

  const printableByCourseId = new Map();
  for (const p of activePrintables) {
    const key = String(p.course);
    if (!printableByCourseId.has(key)) printableByCourseId.set(key, p);
  }

  return {
    courses: orderedCourses.map((c, idx) => {
      const printable = printableByCourseId.get(String(c._id)) || null;
      return {
        stepNumber: idx + 1,
        id: String(c._id),
        title: c.title,
        description: c.description || null,
        coverImage: c.coverImage || null,
        printable: printable
          ? {
              id: String(printable._id),
              title: printable.title,
              description: printable.description,
              coverImage: printable.coverImage,
              pdfUrl: printable.pdfUrl,
              isActive: printable.isActive,
              updatedAt: printable.updatedAt,
            }
          : null,
      };
    }),
  };
};

const uploadModulePrintable = async ({ courseId, userId, title, description, coverImageFile, pdfFile }) => {
  if (!courseId) throw new Error('courseId is required');
  if (!pdfFile) throw new Error('pdfFile is required');
  if (!title) throw new Error('title is required');

  // Upload files to S3 first
  const { url: pdfUrl } = await s3Service.uploadFileFromMulter(pdfFile, 'program-materials/printables/pdfs');
  const coverUpload = coverImageFile ? await s3Service.uploadFileFromMulter(coverImageFile, 'program-materials/printables/covers') : null;
  const coverImage = coverUpload ? coverUpload.url : null;

  // Deactivate previous active printable for this course
  await ProgramPrintable.updateMany(
    { type: 'module', course: courseId, isActive: true },
    { $set: { isActive: false } }
  );

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
  uploadModulePrintable,
  uploadSinglePrintableAsset,
  getPrintableAsset,
};

