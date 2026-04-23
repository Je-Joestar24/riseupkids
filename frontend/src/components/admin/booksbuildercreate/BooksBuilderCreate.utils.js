export const createEmptyPage = (index) => ({
  id: `temp-page-${index + 1}`,
  type: '',
  title: '',
  subtitle: '',
  imageUrl: '',
  audioUrl: '',
  videoUrl: '',
  interactionMode: '',
  guideImageOne: '',
  guideImageTwo: '',
});

export const resetPageByType = {
  subtitle: '',
  imageUrl: '',
  audioUrl: '',
  videoUrl: '',
  interactionMode: '',
  guideImageOne: '',
  guideImageTwo: '',
};

export const isPageComplete = (page) => {
  if (!page?.type || !page?.title?.trim()) return false;
  if (page.type === 'intro') return Boolean(page.videoUrl?.trim());
  if (page.type === 'demo') return Boolean(page.videoUrl?.trim());
  if (page.type === 'reward') return Boolean(page.videoUrl?.trim());
  if (page.type === 'content') {
    return Boolean(page.subtitle?.trim() && page.imageUrl?.trim() && page.audioUrl?.trim());
  }
  if (page.type === 'interactive') {
    if (!page.interactionMode) return false;
    if (page.interactionMode === 'parallel_2x2') {
      return Boolean(page.guideImageOne?.trim() && page.guideImageTwo?.trim());
    }
    return Boolean(page.guideImageOne?.trim());
  }
  return false;
};
