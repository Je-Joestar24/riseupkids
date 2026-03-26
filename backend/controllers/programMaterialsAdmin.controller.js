const programMaterialsAdminService = require('../services/programMaterialsAdmin.service');

const listModules = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const data = await programMaterialsAdminService.listModulesWithPrintables({ page, limit, search });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to list modules' });
  }
};

const listCoursePrintables = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page, limit, search } = req.query;
    const data = await programMaterialsAdminService.listCoursePrintables({
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
      message: error.message || 'Failed to list printable materials',
    });
  }
};

const uploadModulePrintable = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description } = req.body;
    const pdfFile = req.files?.pdfFile?.[0] || null;
    const coverImageFile = req.files?.coverImage?.[0] || null;

    const printable = await programMaterialsAdminService.uploadModulePrintable({
      courseId,
      userId: req.user?._id,
      title,
      description,
      coverImageFile,
      pdfFile,
    });

    return res.status(201).json({ success: true, data: printable });
  } catch (error) {
    const statusCode = error.message?.toLowerCase().includes('required') ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to upload printable' });
  }
};

const uploadFullBundle = async (req, res) => {
  try {
    const { title, description } = req.body;
    const pdfFile = req.files?.pdfFile?.[0] || null;
    const coverImageFile = req.files?.coverImage?.[0] || null;

    const printable = await programMaterialsAdminService.uploadSinglePrintableAsset({
      type: 'full_bundle',
      userId: req.user?._id,
      title,
      description,
      coverImageFile,
      pdfFile,
    });

    return res.status(201).json({ success: true, data: printable });
  } catch (error) {
    const statusCode = error.message?.toLowerCase().includes('required') ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to upload full bundle' });
  }
};

const uploadRecipes = async (req, res) => {
  try {
    const { title, description } = req.body;
    const pdfFile = req.files?.pdfFile?.[0] || null;
    const coverImageFile = req.files?.coverImage?.[0] || null;

    const printable = await programMaterialsAdminService.uploadSinglePrintableAsset({
      type: 'recipes',
      userId: req.user?._id,
      title,
      description,
      coverImageFile,
      pdfFile,
    });

    return res.status(201).json({ success: true, data: printable });
  } catch (error) {
    const statusCode = error.message?.toLowerCase().includes('required') ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to upload recipes' });
  }
};

module.exports = {
  listModules,
  listCoursePrintables,
  uploadModulePrintable,
  uploadFullBundle,
  uploadRecipes,
};

