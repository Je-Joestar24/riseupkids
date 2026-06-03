import {
  buildCmsLayoutPayload,
  buildInteractiveLayoutsFromInteraction,
  createEmptyInteractiveLayouts,
  mergeCmsPagesForBuilder,
  resolveLayoutsForSave,
} from '../../../utils/cmsInteractiveLayout';

let tempPageCounter = 0;

const normalizeTextTokens = (text = '') =>
  String(text)
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

export const adjustReadingWordsForTrim = (words, { durationSec, trimmedStartSec = 0 }) => {
  if (!Array.isArray(words) || !words.length) return [];
  const duration = Number(durationSec);
  const offset = Number(trimmedStartSec) || 0;
  if (!Number.isFinite(duration) || duration <= 0) return words;

  return words
    .map((word) => {
      const start = Number(word?.start);
      const end = Number(word?.end);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
      const nextStart = Number(Math.max(0, start - offset).toFixed(3));
      const nextEnd = Number(Math.min(duration, end - offset).toFixed(3));
      return {
        ...word,
        w: String(word?.w || '').trim(),
        start: nextStart,
        end: nextEnd,
      };
    })
    .filter((word) => word && word.w && word.end > word.start);
};

export const buildWeightedWords = (text, durationSec) => {
  const tokens = normalizeTextTokens(text);
  const duration = Number(durationSec);
  if (!tokens.length || !Number.isFinite(duration) || duration <= 0) return [];

  const weights = tokens.map((token) => Math.max(String(token).length, 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!totalWeight) return [];

  let cursor = 0;
  return tokens.map((token, index) => {
    const raw = (weights[index] / totalWeight) * duration;
    const end = index === tokens.length - 1 ? duration : Math.min(duration, cursor + raw);
    const segment = {
      w: token,
      start: Number(cursor.toFixed(3)),
      end: Number(end.toFixed(3)),
    };
    cursor = end;
    return segment;
  });
};

export const createEmptyPage = (index) => {
  tempPageCounter += 1;
  return {
    id: `temp-page-${index + 1}-${tempPageCounter}`,
    type: '',
    title: '',
    subtitle: '',
    readingText: '',
    readingFontSizePx: null,
    audioDurationSec: null,
    readingWords: [],
    imageUrl: '',
    backgroundImageUrl: '',
    audioUrl: '',
    introBackgroundMusicUrl: '',
    videoUrl: '',
    introBackgroundMusicMediaId: null,
    interactionMode: '',
    optionAudioOne: '',
    optionAudioTwo: '',
    optionImageOne: '',
    optionImageTwo: '',
    guideImageOne: '',
    guideImageTwo: '',
    sceneImageOne: '',
    sceneImageTwo: '',
    answerOneCorrectOptionId: '',
    answerTwoCorrectOptionId: '',
    interactiveLayouts: null,
    sceneImageOneMediaId: null,
    sceneImageTwoMediaId: null,
  };
};

export const resetPageByType = {
  subtitle: '',
  readingText: '',
  readingFontSizePx: null,
  audioDurationSec: null,
  readingWords: [],
  imageUrl: '',
  backgroundImageUrl: '',
  audioUrl: '',
  introBackgroundMusicUrl: '',
  introBackgroundMusicMediaId: null,
  videoUrl: '',
  interactionMode: '',
  optionAudioOne: '',
  optionAudioTwo: '',
  optionImageOne: '',
  optionImageTwo: '',
  guideImageOne: '',
  guideImageTwo: '',
  sceneImageOne: '',
  sceneImageTwo: '',
  answerOneCorrectOptionId: '',
  answerTwoCorrectOptionId: '',
  interactiveLayouts: null,
  sceneImageOneMediaId: null,
  sceneImageTwoMediaId: null,
};

export const getOppositeInteractiveOption = (optionId) => {
  if (optionId === 'option_one') return 'option_two';
  if (optionId === 'option_two') return 'option_one';
  return '';
};

export const isPageComplete = (page) => {
  if (!page?.type) return false;
  if (page.type === 'intro') return Boolean(page.title?.trim() && page.imageUrl?.trim());
  if (page.type === 'demo') return Boolean(page.videoUrl?.trim());
  if (page.type === 'reward') return Boolean(page.videoUrl?.trim());
  if (page.type === 'content') {
    const readableText = page.readingText?.trim() || page.subtitle?.trim();
    return Boolean(readableText && page.imageUrl?.trim() && page.audioUrl?.trim());
  }
  if (page.type === 'interactive') {
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
  const introPage = safePages.find((page) => page?.type === 'intro');
  const title = introPage?.title?.trim() || `Built-in Book ${new Date().toISOString().slice(0, 10)}`;
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
  title: page?.type === 'intro' ? page?.title?.trim() || null : null,
  subtitle: page?.subtitle?.trim() || null,
  media: {},
  reading: null,
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

const toCmsPageTypeForTester = (builderType, interactionMode) => {
  if (builderType === 'intro') return 'cover';
  if (builderType === 'demo') return 'activity_demo_video';
  if (builderType === 'interactive') {
    return interactionMode === 'two_options_two_answers' ? 'activity_drag_2x2' : 'activity_drag_2x1';
  }
  return builderType;
};

/** Maps builder draft pages to the shape expected by CmsBooksModalTest / cmsTest components. */
export const buildTesterPagesFromBuilder = (pages = []) =>
  (Array.isArray(pages) ? pages : [])
    .filter((page) => Boolean(page?.type))
    .map((page, index) => {
      const cmsType = toCmsPageTypeForTester(page.type, page.interactionMode);
      const introBgmUrl =
        page.type === 'intro' ? String(page.introBackgroundMusicUrl || '').trim() : '';

      return {
        pageId: page.id || `page-${index + 1}`,
        order: index + 1,
        type: cmsType,
        title: page.title || null,
        subtitle: page.subtitle || null,
        imageUrl: page.imageUrl || '',
        backgroundImageUrl: page.backgroundImageUrl || '',
        audioUrl: page.type === 'content' ? page.audioUrl || '' : '',
        introBackgroundMusicUrl: introBgmUrl,
        videoUrl: page.videoUrl || '',
        readingText: page.readingText || '',
        readingFontSizePx: page.readingFontSizePx ?? null,
        readingWords: page.readingWords || [],
        audioDurationSec: page.audioDurationSec ?? null,
        reading:
          page.type === 'content'
            ? {
                text: page.readingText || null,
                durationSec: page.audioDurationSec ?? null,
                fontSizePx: page.readingFontSizePx ?? null,
                words: page.readingWords || [],
              }
            : null,
        interactionMode: page.interactionMode || '',
        optionAudioOne: page.optionAudioOne || '',
        optionAudioTwo: page.optionAudioTwo || '',
        optionImageOne: page.optionImageOne || '',
        optionImageTwo: page.optionImageTwo || '',
        guideImageOne: page.guideImageOne || '',
        guideImageTwo: page.guideImageTwo || '',
        sceneImageOne: page.sceneImageOne || '',
        sceneImageTwo: page.sceneImageTwo || '',
        answerOneCorrectOptionId: page.answerOneCorrectOptionId || '',
        answerTwoCorrectOptionId: page.answerTwoCorrectOptionId || '',
        media: {
          imageMedia: page.imageUrl ? { url: page.imageUrl } : null,
          audioMedia: introBgmUrl ? { url: introBgmUrl } : null,
          videoMedia: page.videoUrl ? { url: page.videoUrl } : null,
          backgroundImageMedia: page.backgroundImageUrl ? { url: page.backgroundImageUrl } : null,
          guideImageMedia: page.guideImageOne ? { url: page.guideImageOne } : null,
          guideImageMedias: [page.guideImageOne, page.guideImageTwo]
            .filter(Boolean)
            .map((url) => ({ url })),
          sceneImageMedias: [page.sceneImageOne, page.sceneImageTwo]
            .filter(Boolean)
            .map((url) => ({ url })),
        },
        interaction:
          page.type === 'interactive'
            ? (() => {
                const isParallel = page.interactionMode === 'two_options_two_answers';
                const layoutPayload = buildCmsLayoutPayload(resolveLayoutsForSave(page), { isParallel });
                return {
                  kind: isParallel ? 'drag_2x2' : 'drag_2x1',
                  allowRetry: true,
                  sceneLayouts: layoutPayload.sceneLayouts,
                  options: [
                    {
                      optionId: 'option_one',
                      label: 'Option 1',
                      imageMedia: page.optionImageOne ? { url: page.optionImageOne } : null,
                      audioMedia: page.optionAudioOne ? { url: page.optionAudioOne } : null,
                      layout: layoutPayload.optionOneLayout,
                    },
                    {
                      optionId: 'option_two',
                      label: 'Option 2',
                      imageMedia: page.optionImageTwo ? { url: page.optionImageTwo } : null,
                      audioMedia: page.optionAudioTwo ? { url: page.optionAudioTwo } : null,
                      layout: layoutPayload.optionTwoLayout,
                    },
                  ],
                  dropZones: isParallel
                    ? [
                        {
                          zoneId: 'zone_one',
                          label: 'Answer 1',
                          correctOptionId: page.answerOneCorrectOptionId,
                          layout: layoutPayload.answerOneLayout,
                        },
                        {
                          zoneId: 'zone_two',
                          label: 'Answer 2',
                          correctOptionId: page.answerTwoCorrectOptionId,
                          layout: layoutPayload.answerTwoLayout,
                        },
                      ]
                    : [
                        {
                          zoneId: 'zone_one',
                          label: 'Answer 1',
                          correctOptionId: page.answerOneCorrectOptionId,
                          layout: layoutPayload.answerOneLayout,
                        },
                      ],
                };
              })()
            : null,
      };
    });

export const buildBuilderPageFromCms = (page = {}, index = 0, adminPage = page) => {
  const builderType = toBuilderPageType(page.type);
  const media = page.media || {};
  const options = Array.isArray(page?.interaction?.options) ? page.interaction.options : [];
  const dropZones = Array.isArray(page?.interaction?.dropZones) ? page.interaction.dropZones : [];
  const optionOne = options[0] || {};
  const optionTwo = options[1] || {};
  const adminMedia = adminPage?.media || {};
  const interactionMode =
    adminPage?.type === 'activity_drag_2x2' ? 'two_options_two_answers' : 'two_options_one_answer';

  return {
    ...createEmptyPage(index),
    id: page.pageId || `page-${index + 1}`,
    type: builderType,
    title: page.title || '',
    subtitle: page.subtitle || '',
    readingText: page?.reading?.text || page.subtitle || '',
    readingFontSizePx: page?.reading?.fontSizePx ?? null,
    audioDurationSec: page?.reading?.durationSec ?? null,
    readingWords: Array.isArray(page?.reading?.words) ? page.reading.words : [],
    imageUrl: toMediaUrl(media.imageMedia) || '',
    backgroundImageUrl: toMediaUrl(media.backgroundImageMedia) || '',
    audioUrl: builderType === 'content' ? toMediaUrl(media.audioMedia) || '' : '',
    introBackgroundMusicUrl:
      builderType === 'intro'
        ? String(page.introBackgroundMusicUrl || toMediaUrl(media.audioMedia) || '').trim()
        : '',
    videoUrl: toMediaUrl(media.videoMedia) || '',
    interactionMode,
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
    sceneImageOne:
      toMediaUrl(media.sceneImageMedias?.[0])
      || toMediaUrl(media.sceneImageMedia)
      || toMediaUrl(adminMedia.sceneImageMedias?.[0])
      || toMediaUrl(adminMedia.sceneImageMedia)
      || '',
    sceneImageTwo:
      toMediaUrl(media.sceneImageMedias?.[1])
      || toMediaUrl(adminMedia.sceneImageMedias?.[1])
      || '',
    interactiveLayouts: buildInteractiveLayoutsFromInteraction({
      type: adminPage.type || page.type,
      interaction: adminPage.interaction || page.interaction,
      interactionMode:
        adminPage.type === 'activity_drag_2x2' ? 'two_options_two_answers' : 'two_options_one_answer',
    }),
    sceneImageOneMediaId:
      Array.isArray(adminMedia.sceneImageMediaIds) ? adminMedia.sceneImageMediaIds[0] || null : adminMedia.sceneImageMediaId || null,
    sceneImageTwoMediaId:
      Array.isArray(adminMedia.sceneImageMediaIds) ? adminMedia.sceneImageMediaIds[1] || null : null,
    imageMediaId: media.imageMediaId || null,
    backgroundImageMediaId: media.backgroundImageMediaId || null,
    audioMediaId: builderType === 'content' ? media.audioMediaId || null : null,
    introBackgroundMusicMediaId:
      builderType === 'intro' ? media.audioMediaId || page.introBackgroundMusicMediaId || null : null,
    videoMediaId: media.videoMediaId || null,
    guideImageMediaId: media.guideImageMediaId || null,
    guideImageMediaIds: Array.isArray(media.guideImageMediaIds) ? media.guideImageMediaIds : [],
    optionOneImageMediaId: optionOne.imageMediaId || null,
    optionOneAudioMediaId: optionOne.audioMediaId || null,
    optionTwoImageMediaId: optionTwo.imageMediaId || null,
    optionTwoAudioMediaId: optionTwo.audioMediaId || null,
  };
};

const preserveMediaUrl = (nextUrl, prevUrl, nextMediaId, prevMediaId) => {
  const next = String(nextUrl || '').trim();
  const prev = String(prevUrl || '').trim();
  if (next) return nextUrl || '';
  if (!prev) return '';
  if (!nextMediaId || !prevMediaId || String(nextMediaId) === String(prevMediaId)) {
    return prevUrl || '';
  }
  return '';
};

export const preserveBuilderPageMedia = (nextPage = {}, prevPage = null) => {
  if (!prevPage) return nextPage;

  return {
    ...nextPage,
    imageUrl: preserveMediaUrl(nextPage.imageUrl, prevPage.imageUrl, nextPage.imageMediaId, prevPage.imageMediaId),
    backgroundImageUrl: preserveMediaUrl(
      nextPage.backgroundImageUrl,
      prevPage.backgroundImageUrl,
      nextPage.backgroundImageMediaId,
      prevPage.backgroundImageMediaId
    ),
    audioUrl: preserveMediaUrl(nextPage.audioUrl, prevPage.audioUrl, nextPage.audioMediaId, prevPage.audioMediaId),
    introBackgroundMusicUrl: preserveMediaUrl(
      nextPage.introBackgroundMusicUrl,
      prevPage.introBackgroundMusicUrl,
      nextPage.introBackgroundMusicMediaId,
      prevPage.introBackgroundMusicMediaId
    ),
    videoUrl: preserveMediaUrl(nextPage.videoUrl, prevPage.videoUrl, nextPage.videoMediaId, prevPage.videoMediaId),
    sceneImageOne: preserveMediaUrl(
      nextPage.sceneImageOne,
      prevPage.sceneImageOne,
      nextPage.sceneImageOneMediaId,
      prevPage.sceneImageOneMediaId
    ),
    sceneImageTwo: preserveMediaUrl(
      nextPage.sceneImageTwo,
      prevPage.sceneImageTwo,
      nextPage.sceneImageTwoMediaId,
      prevPage.sceneImageTwoMediaId
    ),
    guideImageOne: preserveMediaUrl(
      nextPage.guideImageOne,
      prevPage.guideImageOne,
      nextPage.guideImageMediaId,
      prevPage.guideImageMediaId
    ),
    guideImageTwo: preserveMediaUrl(
      nextPage.guideImageTwo,
      prevPage.guideImageTwo,
      nextPage.guideImageMediaIds?.[1],
      prevPage.guideImageMediaIds?.[1]
    ),
    optionImageOne: preserveMediaUrl(
      nextPage.optionImageOne,
      prevPage.optionImageOne,
      nextPage.optionOneImageMediaId,
      prevPage.optionOneImageMediaId
    ),
    optionImageTwo: preserveMediaUrl(
      nextPage.optionImageTwo,
      prevPage.optionImageTwo,
      nextPage.optionTwoImageMediaId,
      prevPage.optionTwoImageMediaId
    ),
    optionAudioOne: preserveMediaUrl(
      nextPage.optionAudioOne,
      prevPage.optionAudioOne,
      nextPage.optionOneAudioMediaId,
      prevPage.optionOneAudioMediaId
    ),
    optionAudioTwo: preserveMediaUrl(
      nextPage.optionAudioTwo,
      prevPage.optionAudioTwo,
      nextPage.optionTwoAudioMediaId,
      prevPage.optionTwoAudioMediaId
    ),
    interactiveLayouts: nextPage.interactiveLayouts || prevPage.interactiveLayouts || null,
  };
};

export const mapCmsBookPagesToBuilder = (
  sourcePages = [],
  playableByPageId = new Map(),
  previousPages = []
) => {
  const sorted = [...(Array.isArray(sourcePages) ? sourcePages : [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );
  const previousById = new Map(
    (Array.isArray(previousPages) ? previousPages : []).map((page) => [String(page.id || ''), page])
  );

  return sorted.map((adminPage, index) => {
    const playablePage = playableByPageId.get(String(adminPage.pageId || ''));
    const mergedPage = mergeCmsPagesForBuilder(adminPage, playablePage);
    const mapped = buildBuilderPageFromCms(mergedPage, index, adminPage);
    const prev = previousById.get(String(mapped.id || ''));
    return preserveBuilderPageMedia(mapped, prev);
  });
};
