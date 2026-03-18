const programMaterialsService = require('../services/programMaterials.service');

/**
 * @desc    Get program materials for a selected child
 * @route   GET /api/parent/program-materials/children/:childId
 * @access  Private (Parent/Admin)
 */
const getProgramMaterialsForChild = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentUserId = req.user?._id;

    const data = await programMaterialsService.getProgramMaterialsForChild({
      parentUserId,
      childId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get program materials',
    });
  }
};

module.exports = {
  getProgramMaterialsForChild,
};

