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
  if (page.type === 'intro') return Boolean(page.imageUrl?.trim());
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

export const isValidPageSequence = (pages) => {
  const typedPages = pages.filter((page) => page?.type);
  if (!typedPages.length) return true;

  let stage = 'intro';
  let introCount = 0;
  let demoCount = 0;
  let rewardCount = 0;
  let contentCount = 0;

  for (let index = 0; index < typedPages.length; index += 1) {
    const page = typedPages[index];
    const { type } = page;

    if (type === 'intro') {
      introCount += 1;
      if (introCount > 1 || index !== 0 || stage !== 'intro') return false;
      stage = 'content_or_demo';
      continue;
    }

    if (type === 'content') {
      if (stage !== 'content_or_demo') return false;
      contentCount += 1;
      continue;
    }

    if (type === 'demo') {
      demoCount += 1;
      if (demoCount > 1 || stage !== 'content_or_demo' || contentCount === 0) return false;
      stage = 'interactive_or_reward';
      continue;
    }

    if (type === 'interactive') {
      if (stage !== 'interactive_or_reward') return false;
      continue;
    }

    if (type === 'reward') {
      rewardCount += 1;
      if (rewardCount > 1 || stage !== 'interactive_or_reward' || index !== typedPages.length - 1) return false;
      stage = 'done';
      continue;
    }

    return false;
  }

  if (introCount !== 1) return false;
  return true;
};
