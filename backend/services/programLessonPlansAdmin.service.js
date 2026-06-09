const { Course, ProgramLessonPlan } = require('../models');
const s3Service = require('./s3.service');

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

const manageableCourseFilter = { isArchived: false };

const orderCoursesForModules = (courses) =>
  courses.sort((a, b) => {
    const aOrder = a.stepOrder !== null && a.stepOrder !== undefined;
    const bOrder = b.stepOrder !== null && b.stepOrder !== undefined;
    if (aOrder && bOrder) return a.stepOrder - b.stepOrder;
    if (aOrder && !bOrder) return -1;
    if (!aOrder && bOrder) return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

const listModulesWithLessonPlans = async ({ page = 1, limit = 10, search = '', isPublished } = {}) => {
  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 10), 100);
  const skip = (safePage - 1) * safeLimit;
  const safeSearch = String(search || '').trim();
  const publishedFilter = parseOptionalBoolean(isPublished);

  const query = { ...manageableCourseFilter };
  if (publishedFilter !== undefined) {
    query.isPublished = publishedFilter;
  }
  if (safeSearch) {
    query.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const total = await Course.countDocuments(query);
  const courses = await Course.find(query)
    .select('_id title description coverImage stepOrder contents createdAt isPublished')
    .sort({ stepOrder: 1, createdAt: 1 })
    .skip(skip)
    .limit(safeLimit)
    .lean();

  const orderedCourses = orderCoursesForModules(courses);
  const courseIds = orderedCourses.map((c) => c._id);

  const activeLessonPlans = await ProgramLessonPlan.find({
    isActive: true,
    course: { $in: courseIds },
  })
    .sort({ course: 1, createdAt: 1 })
    .lean();

  const lessonPlansByCourseId = new Map();
  for (const lessonPlan of activeLessonPlans) {
    const key = String(lessonPlan.course);
    if (!lessonPlansByCourseId.has(key)) lessonPlansByCourseId.set(key, []);
    lessonPlansByCourseId.get(key).push(lessonPlan);
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
      const lessonPlans = lessonPlansByCourseId.get(String(c._id)) || [];
      return {
        stepNumber: skip + idx + 1,
        id: String(c._id),
        title: c.title,
        description: c.description || null,
        coverImage: c.coverImage || null,
        contentCount: Array.isArray(c.contents) ? c.contents.length : 0,
        isPublished: Boolean(c.isPublished),
        lessonPlanCount: lessonPlans.length,
        latestLessonPlanAt: lessonPlans.length ? lessonPlans[lessonPlans.length - 1].updatedAt : null,
      };
    }),
  };
};

const uploadModuleLessonPlan = async ({ courseId, title, description, coverImageFile, pdfFile }) => {
  if (!courseId) throw new Error('courseId is required');
  if (!pdfFile) throw new Error('pdfFile is required');
  if (!title) throw new Error('title is required');

  const course = await Course.findOne({ _id: courseId, ...manageableCourseFilter }).select('_id');
  if (!course) throw new Error('Course not found');

  const { url: pdfUrl } = await s3Service.uploadFileFromMulter(pdfFile, 'program-materials/lesson-plans/pdfs');
  const coverUpload = coverImageFile
    ? await s3Service.uploadFileFromMulter(coverImageFile, 'program-materials/lesson-plans/covers')
    : null;
  const coverImage = coverUpload ? coverUpload.url : null;

  return ProgramLessonPlan.create({
    course: courseId,
    title,
    description: description || null,
    coverImage,
    pdfUrl,
    isActive: true,
  });
};

const getCourseLessonPlanById = async ({ courseId, lessonPlanId }) => {
  if (!courseId) throw new Error('courseId is required');
  if (!lessonPlanId) throw new Error('lessonPlanId is required');

  const lessonPlan = await ProgramLessonPlan.findOne({
    _id: lessonPlanId,
    course: courseId,
    isActive: true,
  }).lean();
  if (!lessonPlan) throw new Error('Lesson plan not found');

  return {
    id: String(lessonPlan._id),
    courseId: String(lessonPlan.course),
    title: lessonPlan.title,
    description: lessonPlan.description || null,
    coverImage: lessonPlan.coverImage || null,
    pdfUrl: lessonPlan.pdfUrl,
    isActive: lessonPlan.isActive,
    createdAt: lessonPlan.createdAt,
    updatedAt: lessonPlan.updatedAt,
  };
};

const updateCourseLessonPlan = async ({
  courseId,
  lessonPlanId,
  title,
  description,
  coverImageFile,
  pdfFile,
}) => {
  if (!courseId) throw new Error('courseId is required');
  if (!lessonPlanId) throw new Error('lessonPlanId is required');

  const lessonPlan = await ProgramLessonPlan.findOne({
    _id: lessonPlanId,
    course: courseId,
    isActive: true,
  });
  if (!lessonPlan) throw new Error('Lesson plan not found');

  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  if (!normalizedTitle) throw new Error('title is required');

  lessonPlan.title = normalizedTitle;
  lessonPlan.description = typeof description === 'string' && description.trim()
    ? description.trim()
    : null;

  if (pdfFile) {
    const { url: pdfUrl } = await s3Service.uploadFileFromMulter(pdfFile, 'program-materials/lesson-plans/pdfs');
    const currentPdfKey = s3Service.getS3KeyFromUrl(lessonPlan.pdfUrl);
    if (currentPdfKey) {
      await s3Service.deleteByKey(currentPdfKey).catch(() => null);
    }
    lessonPlan.pdfUrl = pdfUrl;
  }

  if (coverImageFile) {
    const { url: coverImage } = await s3Service.uploadFileFromMulter(
      coverImageFile,
      'program-materials/lesson-plans/covers'
    );
    const currentCoverKey = s3Service.getS3KeyFromUrl(lessonPlan.coverImage);
    if (currentCoverKey) {
      await s3Service.deleteByKey(currentCoverKey).catch(() => null);
    }
    lessonPlan.coverImage = coverImage;
  }

  await lessonPlan.save();
  return lessonPlan;
};

const deleteCourseLessonPlan = async ({ courseId, lessonPlanId }) => {
  if (!courseId) throw new Error('courseId is required');
  if (!lessonPlanId) throw new Error('lessonPlanId is required');

  const lessonPlan = await ProgramLessonPlan.findOne({
    _id: lessonPlanId,
    course: courseId,
    isActive: true,
  });
  if (!lessonPlan) throw new Error('Lesson plan not found');

  lessonPlan.isActive = false;
  await lessonPlan.save();

  const pdfKey = s3Service.getS3KeyFromUrl(lessonPlan.pdfUrl);
  if (pdfKey) {
    await s3Service.deleteByKey(pdfKey).catch(() => null);
  }

  const coverKey = s3Service.getS3KeyFromUrl(lessonPlan.coverImage);
  if (coverKey) {
    await s3Service.deleteByKey(coverKey).catch(() => null);
  }

  return { id: String(lessonPlan._id) };
};

const listCourseLessonPlans = async ({ courseId, page = 1, limit = 10, search = '' }) => {
  if (!courseId) throw new Error('courseId is required');
  const course = await Course.findOne({ _id: courseId, ...manageableCourseFilter })
    .select('_id title description coverImage stepOrder isPublished')
    .lean();
  if (!course) throw new Error('Course not found');

  const safePage = parsePositiveInt(page, 1);
  const safeLimit = Math.min(parsePositiveInt(limit, 10), 100);
  const skip = (safePage - 1) * safeLimit;
  const safeSearch = String(search || '').trim();

  const query = { isActive: true, course: courseId };
  if (safeSearch) {
    query.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const total = await ProgramLessonPlan.countDocuments(query);
  const lessonPlans = await ProgramLessonPlan.find(query)
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
      isPublished: Boolean(course.isPublished),
    },
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasNextPage: safePage * safeLimit < total,
      hasPrevPage: safePage > 1,
    },
    lessonPlans: lessonPlans.map((p) => ({
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

module.exports = {
  listModulesWithLessonPlans,
  listCourseLessonPlans,
  getCourseLessonPlanById,
  uploadModuleLessonPlan,
  updateCourseLessonPlan,
  deleteCourseLessonPlan,
};
