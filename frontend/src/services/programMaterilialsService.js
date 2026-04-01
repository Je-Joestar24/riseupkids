import api from '../api/axios';

/**
 * Program Materials Service
 *
 * Fetches printable materials by step for a selected child.
 */
const normalizePrintable = (printable, index = 0) => ({
  id: printable?.id || null,
  pageNumber: printable?.pageNumber || index + 1,
  label: printable?.label || printable?.title || `Page ${index + 1}`,
  title: printable?.title || null,
  description: printable?.description || null,
  coverImage: printable?.coverImage || null,
  fileUrl: printable?.fileUrl || printable?.pdfUrl || null,
  pdfUrl: printable?.pdfUrl || printable?.fileUrl || null,
});

const normalizeModule = (item, index = 0) => {
  const moduleInfo = item?.module || {};
  const rawPrintables = Array.isArray(item?.printables) ? item.printables : [];

  const normalizedPrintables = rawPrintables.map((printable, printableIndex) =>
    normalizePrintable(printable, printableIndex)
  );

  const fallbackUrl =
    item?.printablePdfUrl ||
    item?.fileUrl ||
    item?.printable?.pdfUrl ||
    normalizedPrintables.find((printable) => printable?.fileUrl)?.fileUrl ||
    null;

  return {
    id: item?.id || moduleInfo?.id || null,
    stepNumber: item?.stepNumber || index + 1,
    title: item?.title || moduleInfo?.title || `Module ${index + 1}`,
    description: item?.description || moduleInfo?.description || null,
    coverImage: item?.coverImage || moduleInfo?.coverImage || null,
    isUnlocked: item?.isUnlocked !== false,
    printablePdfUrl: fallbackUrl,
    progress: item?.progress || { totalCount: 0, completedCount: 0, percent: 0 },
    printables: normalizedPrintables,
  };
};

const normalizeProgramMaterialsResponse = (payload) => {
  const modulesSource = Array.isArray(payload?.unlocking?.modules)
    ? payload.unlocking.modules
    : Array.isArray(payload?.materialsByStep)
      ? payload.materialsByStep
      : [];

  return {
    child: payload?.child || null,
    unlocking: payload?.unlocking || null,
    modules: modulesSource.map((item, index) => normalizeModule(item, index)),
    fullBundle: payload?.fullBundle || null,
    recipes: payload?.recipes || null,
    raw: payload,
  };
};

const programMaterilialsService = {
  /**
   * Get printable materials for one child profile.
   * @param {string} childId
   * @returns {Promise<object>}
   */
  getByChildId: async (childId) => {
    if (!childId) {
      throw new Error('childId is required');
    }

    try {
      const response = await api.get(`/parent/program-materials/children/${childId}`);
      return normalizeProgramMaterialsResponse(response.data?.data || response.data);
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to fetch program materials';
    }
  },
};

export default programMaterilialsService;
