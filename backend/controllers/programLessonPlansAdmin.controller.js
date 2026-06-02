const programLessonPlansAdminService = require('../services/programLessonPlansAdmin.service');

const listModules = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const data = await programLessonPlansAdminService.listModulesWithLessonPlans({ page, limit, search });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to list modules' });
  }
};

const listCourseLessonPlans = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page, limit, search } = req.query;
    const data = await programLessonPlansAdminService.listCourseLessonPlans({
      courseId,
      page,
      limit,
      search,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.message === 'Course not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to list lesson plans',
    });
  }
};

const getCourseLessonPlanById = async (req, res) => {
  try {
    const { courseId, lessonPlanId } = req.params;
    const data = await programLessonPlansAdminService.getCourseLessonPlanById({
      courseId,
      lessonPlanId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.message === 'Lesson plan not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get lesson plan',
    });
  }
};

const uploadModuleLessonPlan = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description } = req.body;
    const pdfFile = req.files?.pdfFile?.[0] || null;
    const coverImageFile = req.files?.coverImage?.[0] || null;

    const lessonPlan = await programLessonPlansAdminService.uploadModuleLessonPlan({
      courseId,
      userId: req.user?._id,
      title,
      description,
      coverImageFile,
      pdfFile,
    });

    return res.status(201).json({ success: true, data: lessonPlan });
  } catch (error) {
    const statusCode = error.message?.toLowerCase().includes('required') ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to upload lesson plan' });
  }
};

const updateCourseLessonPlan = async (req, res) => {
  try {
    const { courseId, lessonPlanId } = req.params;
    const { title, description } = req.body;
    const pdfFile = req.files?.pdfFile?.[0] || null;
    const coverImageFile = req.files?.coverImage?.[0] || null;

    const lessonPlan = await programLessonPlansAdminService.updateCourseLessonPlan({
      courseId,
      lessonPlanId,
      title,
      description,
      coverImageFile,
      pdfFile,
    });

    return res.status(200).json({ success: true, data: lessonPlan });
  } catch (error) {
    const errorMessage = error.message || 'Failed to update lesson plan';
    const statusCode = ['courseid is required', 'lessonplanid is required', 'title is required'].includes(
      errorMessage.toLowerCase()
    )
      ? 400
      : errorMessage === 'Lesson plan not found'
        ? 404
        : 500;
    return res.status(statusCode).json({ success: false, message: errorMessage });
  }
};

const deleteCourseLessonPlan = async (req, res) => {
  try {
    const { courseId, lessonPlanId } = req.params;
    const data = await programLessonPlansAdminService.deleteCourseLessonPlan({
      courseId,
      lessonPlanId,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.message === 'Lesson plan not found' ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete lesson plan',
    });
  }
};

module.exports = {
  listModules,
  listCourseLessonPlans,
  getCourseLessonPlanById,
  uploadModuleLessonPlan,
  updateCourseLessonPlan,
  deleteCourseLessonPlan,
};
