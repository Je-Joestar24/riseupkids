let tempPageCounter = 0;

export const createEmptyPage = (index) => {
  tempPageCounter += 1;
  return {
    id: `temp-page-${index + 1}-${tempPageCounter}`,
    type: '',
    title: '',
    subtitle: '',
    imageUrl: '',
    backgroundImageUrl: '',
    audioUrl: '',
    videoUrl: '',
    interactionMode: '',
    optionAudioOne: '',
    optionAudioTwo: '',
    optionImageOne: '',
    optionImageTwo: '',
    guideImageOne: '',
    guideImageTwo: '',
    answerOneCorrectOptionId: '',
    answerTwoCorrectOptionId: '',
  };
};

export const resetPageByType = {
  subtitle: '',
  imageUrl: '',
  backgroundImageUrl: '',
  audioUrl: '',
  videoUrl: '',
  interactionMode: '',
  optionAudioOne: '',
  optionAudioTwo: '',
  optionImageOne: '',
  optionImageTwo: '',
  guideImageOne: '',
  guideImageTwo: '',
  answerOneCorrectOptionId: '',
  answerTwoCorrectOptionId: '',
};

export const getOppositeInteractiveOption = (optionId) => {
  if (optionId === 'option_one') return 'option_two';
  if (optionId === 'option_two') return 'option_one';
  return '';
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
    if (!page.backgroundImageUrl?.trim()) return false;
    if (!page.interactionMode) return false;
    const hasRequiredOptionAudio = Boolean(page.optionAudioOne?.trim() && page.optionAudioTwo?.trim());
    const hasRequiredOptionIcons = Boolean(page.optionImageOne?.trim() && page.optionImageTwo?.trim());
    if (!hasRequiredOptionAudio || !hasRequiredOptionIcons) return false;
    if (!page.answerOneCorrectOptionId) return false;

    if (page.interactionMode === 'two_options_two_answers') {
      const hasTwoAnswerImages = Boolean(page.guideImageOne?.trim() && page.guideImageTwo?.trim());
      const hasTwoMappings = Boolean(page.answerOneCorrectOptionId && page.answerTwoCorrectOptionId);
      const hasUniqueMappings = page.answerOneCorrectOptionId !== page.answerTwoCorrectOptionId;
      return Boolean(hasTwoAnswerImages && hasTwoMappings && hasUniqueMappings);
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
      stage = 'content';
      continue;
    }

    if (type === 'content') {
      if (stage !== 'content' && stage !== 'after_content') return false;
      contentCount += 1;
      stage = 'after_content';
      continue;
    }

    if (type === 'demo') {
      demoCount += 1;
      if (demoCount > 1 || stage !== 'after_content' || contentCount === 0) return false;
      stage = 'interactive_or_reward';
      continue;
    }

    if (type === 'interactive') {
      if (stage !== 'after_content' && stage !== 'interactive_or_reward') return false;
      stage = 'interactive_or_reward';
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

export const buildCmsBookCreatePayload = (pages = [], cmsPages = []) => {
  const safePages = Array.isArray(pages) ? pages : [];
  const firstTitledPage = safePages.find((page) => String(page?.title || '').trim());
  const title = firstTitledPage?.title?.trim() || `Built-in Book ${new Date().toISOString().slice(0, 10)}`;
  const typedPageCount = safePages.filter((page) => Boolean(page?.type)).length;

  return {
    title,
    description: `Built with Books Builder (${typedPageCount} configured pages).`,
    language: 'en',
    pages: Array.isArray(cmsPages) ? cmsPages : [],
  };
};

const normalizeInteractiveKind = (interactionMode) =>
  interactionMode === 'two_options_two_answers' ? 'drag_2x2' : 'drag_2x1';

const toCmsPageType = (builderType, interactionMode) => {
  if (builderType === 'intro') return 'cover';
  if (builderType === 'demo') return 'activity_demo_video';
  if (builderType === 'interactive') {
    return normalizeInteractiveKind(interactionMode) === 'drag_2x2'
      ? 'activity_drag_2x2'
      : 'activity_drag_2x1';
  }
  return builderType;
};

export const buildCmsPageSkeleton = ({ page, index }) => ({
  pageId: page?.id || `page-${index + 1}`,
  order: index + 1,
  type: toCmsPageType(page?.type, page?.interactionMode),
  title: page?.title?.trim() || null,
  subtitle: page?.subtitle?.trim() || null,
  media: {},
  interaction: null,
  navigation: {
    allowBack: true,
    allowNext: true,
    requireCompletionToNext: Boolean(page?.type === 'interactive'),
  },
  scoring: {
    enabled: false,
    points: 0,
    awardMode: 'once_on_correct',
  },
});

const toBuilderPageType = (cmsType) => {
  if (cmsType === 'cover') return 'intro';
  if (cmsType === 'activity_demo_video') return 'demo';
  if (cmsType === 'activity_drag_2x2' || cmsType === 'activity_drag_2x1') return 'interactive';
  return cmsType;
};

const toMediaUrl = (media) => media?.url || media?.cloudUrl || '';

export const buildBuilderPageFromCms = (page = {}, index = 0) => {
  const builderType = toBuilderPageType(page.type);
  const media = page.media || {};
  const options = Array.isArray(page?.interaction?.options) ? page.interaction.options : [];
  const dropZones = Array.isArray(page?.interaction?.dropZones) ? page.interaction.dropZones : [];
  const optionOne = options[0] || {};
  const optionTwo = options[1] || {};

  return {
    ...createEmptyPage(index),
    id: page.pageId || `page-${index + 1}`,
    type: builderType,
    title: page.title || '',
    subtitle: page.subtitle || '',
    imageUrl: toMediaUrl(media.imageMedia) || '',
    backgroundImageUrl: toMediaUrl(media.backgroundImageMedia) || '',
    audioUrl: toMediaUrl(media.audioMedia) || '',
    videoUrl: toMediaUrl(media.videoMedia) || '',
    interactionMode: page.type === 'activity_drag_2x2' ? 'two_options_two_answers' : 'two_options_one_answer',
    optionAudioOne: toMediaUrl(optionOne.audioMedia) || '',
    optionAudioTwo: toMediaUrl(optionTwo.audioMedia) || '',
    optionImageOne: toMediaUrl(optionOne.imageMedia) || '',
    optionImageTwo: toMediaUrl(optionTwo.imageMedia) || '',
    guideImageOne:
      toMediaUrl(media.guideImageMedia)
      || (Array.isArray(media.guideImageMedias) ? toMediaUrl(media.guideImageMedias[0]) : '')
      || '',
    guideImageTwo: Array.isArray(media.guideImageMedias) ? toMediaUrl(media.guideImageMedias[1]) || '' : '',
    answerOneCorrectOptionId: dropZones[0]?.correctOptionId || '',
    answerTwoCorrectOptionId: dropZones[1]?.correctOptionId || '',
    imageMediaId: media.imageMediaId || null,
    backgroundImageMediaId: media.backgroundImageMediaId || null,
    audioMediaId: media.audioMediaId || null,
    videoMediaId: media.videoMediaId || null,
    guideImageMediaId: media.guideImageMediaId || null,
    guideImageMediaIds: Array.isArray(media.guideImageMediaIds) ? media.guideImageMediaIds : [],
    optionOneImageMediaId: optionOne.imageMediaId || null,
    optionOneAudioMediaId: optionOne.audioMediaId || null,
    optionTwoImageMediaId: optionTwo.imageMediaId || null,
    optionTwoAudioMediaId: optionTwo.audioMediaId || null,
  };
};
