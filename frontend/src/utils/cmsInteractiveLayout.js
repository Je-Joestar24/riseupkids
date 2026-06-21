export const CMS_DESIGN_WIDTH = 1920;
export const CMS_DESIGN_HEIGHT = 1080;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const normalizeLayoutRect = (rect) => {
  if (rect == null || typeof rect !== 'object') return null;
  const xPct = Number(rect.xPct);
  const yPct = Number(rect.yPct);
  const wPct = Number(rect.wPct);
  const hPct = Number(rect.hPct);
  if (![xPct, yPct, wPct, hPct].every((n) => Number.isFinite(n))) return null;
  return {
    xPct: clamp(xPct, 0, 100),
    yPct: clamp(yPct, 0, 100),
    wPct: clamp(wPct, 2, 100),
    hPct: clamp(hPct, 2, 100),
  };
};

export const hasCustomInteractiveLayout = (page = {}) => {
  const interaction = page?.interaction || {};
  const sceneLayouts = Array.isArray(interaction.sceneLayouts) ? interaction.sceneLayouts : [];
  if (sceneLayouts.some((item) => normalizeLayoutRect(item))) return true;

  const options = Array.isArray(interaction.options) ? interaction.options : [];
  if (options.some((option) => normalizeLayoutRect(option?.layout))) return true;

  const dropZones = Array.isArray(interaction.dropZones) ? interaction.dropZones : [];
  if (dropZones.some((zone) => normalizeLayoutRect(zone?.layout))) return true;

  const layouts = page?.interactiveLayouts || {};
  return Boolean(
    normalizeLayoutRect(layouts.sceneOne)
    || normalizeLayoutRect(layouts.sceneTwo)
    || normalizeLayoutRect(layouts.optionOne)
    || normalizeLayoutRect(layouts.optionTwo)
    || normalizeLayoutRect(layouts.answerOne)
    || normalizeLayoutRect(layouts.answerTwo)
  );
};

const pct = (px, total) => Number(((px / total) * 100).toFixed(3));

export const getDefaultInteractiveLayouts = (isParallel = false) => {
  const cardW = isParallel ? pct(315, CMS_DESIGN_WIDTH) : pct(320, CMS_DESIGN_WIDTH);
  const cardH = isParallel ? pct(238, CMS_DESIGN_HEIGHT) : pct(272, CMS_DESIGN_HEIGHT);
  const gap = pct(96, CMS_DESIGN_WIDTH);
  const totalOptionsW = cardW * 2 + gap;
  const optionStartX = pct((CMS_DESIGN_WIDTH - (320 * 2 + 96)) / 2, CMS_DESIGN_WIDTH);
  const parallelOptionStartX = pct((CMS_DESIGN_WIDTH - (315 * 2 + 96)) / 2, CMS_DESIGN_WIDTH);
  const startX = isParallel ? parallelOptionStartX : optionStartX;

  const optionY = isParallel
    ? pct(CMS_DESIGN_HEIGHT - 238 - 96, CMS_DESIGN_HEIGHT)
    : pct((CMS_DESIGN_HEIGHT - 272) / 2, CMS_DESIGN_HEIGHT);

  const answerY = isParallel ? pct(56 - (238 / CMS_DESIGN_HEIGHT) * 50, CMS_DESIGN_HEIGHT) : pct(45.4, 100);
  const answerCenterX = 50 - cardW;

  const layouts = {
    sceneOne: isParallel
      ? { xPct: 6, yPct: 10, wPct: 38, hPct: 32 }
      : { xPct: 8, yPct: 10, wPct: 34, hPct: 30 },
    sceneTwo: isParallel
      ? { xPct: 56, yPct: 10, wPct: 38, hPct: 32 }
      : null,
    answerOne: {
      xPct: isParallel ? answerCenterX : 50 - cardW / 2,
      yPct: answerY,
      wPct: cardW,
      hPct: cardH,
    },
    answerTwo: isParallel
      ? {
          xPct: 50 + gap / 2,
          yPct: answerY,
          wPct: cardW,
          hPct: cardH,
        }
      : null,
    optionOne: {
      xPct: startX,
      yPct: optionY,
      wPct: cardW,
      hPct: cardH,
    },
    optionTwo: {
      xPct: startX + cardW + gap,
      yPct: optionY,
      wPct: cardW,
      hPct: cardH,
    },
  };

  return layouts;
};

export const createEmptyInteractiveLayouts = (isParallel = false) => {
  const defaults = getDefaultInteractiveLayouts(isParallel);
  return {
    sceneOne: defaults.sceneOne,
    sceneTwo: defaults.sceneTwo,
    answerOne: defaults.answerOne,
    answerTwo: defaults.answerTwo,
    optionOne: defaults.optionOne,
    optionTwo: defaults.optionTwo,
  };
};

export const resolveBuilderInteractiveLayouts = (page = {}) => {
  const isParallel = page.interactionMode === 'two_options_two_answers';
  const defaults = getDefaultInteractiveLayouts(isParallel);
  const stored = page.interactiveLayouts || {};
  const pick = (key) => normalizeLayoutRect(stored[key]) || defaults[key] || null;

  return {
    sceneOne: pick('sceneOne'),
    sceneTwo: isParallel ? pick('sceneTwo') : null,
    answerOne: pick('answerOne'),
    answerTwo: isParallel ? pick('answerTwo') : null,
    optionOne: pick('optionOne'),
    optionTwo: pick('optionTwo'),
  };
};

export const layoutRectToPx = (rect, stageWidth, stageHeight) => {
  const safe = normalizeLayoutRect(rect);
  if (!safe) return null;
  return {
    left: (safe.xPct / 100) * stageWidth,
    top: (safe.yPct / 100) * stageHeight,
    width: (safe.wPct / 100) * stageWidth,
    height: (safe.hPct / 100) * stageHeight,
  };
};

export const pxToLayoutRect = ({ left, top, width, height }, stageWidth, stageHeight) => ({
  xPct: clamp(pct(left, stageWidth), 0, 100),
  yPct: clamp(pct(top, stageHeight), 0, 100),
  wPct: clamp(pct(width, stageWidth), 2, 100),
  hPct: clamp(pct(height, stageHeight), 2, 100),
});

const resolveIsParallelInteractive = (page = {}) =>
  page.type === 'activity_drag_2x2'
  || page?.interaction?.kind === 'drag_2x2'
  || page.interactionMode === 'two_options_two_answers';

/** Builder load: always apply saved CMS rects when present (per-element), else defaults. */
export const buildInteractiveLayoutsFromInteraction = (page = {}) => {
  const isParallel = resolveIsParallelInteractive(page);
  const defaults = getDefaultInteractiveLayouts(isParallel);
  const interaction = page.interaction || {};
  const options = Array.isArray(interaction.options) ? interaction.options : [];
  const dropZones = Array.isArray(interaction.dropZones) ? interaction.dropZones : [];
  const sceneLayouts = Array.isArray(interaction.sceneLayouts) ? interaction.sceneLayouts : [];
  const pick = (custom, fallback) => normalizeLayoutRect(custom) || fallback;

  return {
    sceneOne: pick(sceneLayouts[0], defaults.sceneOne),
    sceneTwo: isParallel ? pick(sceneLayouts[1], defaults.sceneTwo) : null,
    answerOne: pick(dropZones[0]?.layout, defaults.answerOne),
    answerTwo: isParallel ? pick(dropZones[1]?.layout, defaults.answerTwo) : null,
    optionOne: pick(options[0]?.layout, defaults.optionOne),
    optionTwo: pick(options[1]?.layout, defaults.optionTwo),
  };
};

/** Player fallback: only use CMS rects when the page has any saved layout metadata. */
export const extractInteractiveLayoutsFromCms = (page = {}) => {
  const isParallel = resolveIsParallelInteractive(page);
  const defaults = getDefaultInteractiveLayouts(isParallel);
  const useCustom = hasCustomInteractiveLayout(page);
  if (!useCustom) {
    return {
      sceneOne: defaults.sceneOne,
      sceneTwo: isParallel ? defaults.sceneTwo : null,
      answerOne: defaults.answerOne,
      answerTwo: isParallel ? defaults.answerTwo : null,
      optionOne: defaults.optionOne,
      optionTwo: defaults.optionTwo,
    };
  }
  return buildInteractiveLayoutsFromInteraction(page);
};

/** What the builder canvas shows and what we persist on save. */
export const resolveLayoutsForSave = (page = {}) => {
  const stored = page.interactiveLayouts || {};
  const fromInteraction = buildInteractiveLayoutsFromInteraction(page);
  const isParallel = page.interactionMode === 'two_options_two_answers';
  const keys = ['sceneOne', 'optionOne', 'optionTwo', 'answerOne'];
  if (isParallel) keys.push('sceneTwo', 'answerTwo');

  const merged = {};
  keys.forEach((key) => {
    merged[key] = normalizeLayoutRect(stored[key]) || fromInteraction[key] || null;
  });
  return merged;
};

export const mergeInteractionForBuilder = (adminInteraction = null, playableInteraction = null) => {
  const admin = adminInteraction || {};
  const playable = playableInteraction || {};
  const adminOptions = Array.isArray(admin.options) ? admin.options : [];
  const playableOptions = Array.isArray(playable.options) ? playable.options : [];
  const adminZones = Array.isArray(admin.dropZones) ? admin.dropZones : [];
  const playableZones = Array.isArray(playable.dropZones) ? playable.dropZones : [];

  const mergeByIndex = (adminItems, playableItems) =>
    Array.from({ length: Math.max(adminItems.length, playableItems.length) }, (_, index) => ({
      ...(adminItems[index] || {}),
      ...(playableItems[index] || {}),
      layout:
        normalizeLayoutRect(adminItems[index]?.layout)
        || normalizeLayoutRect(playableItems[index]?.layout)
        || null,
    }));

  const adminSceneLayouts = Array.isArray(admin.sceneLayouts) ? admin.sceneLayouts : [];
  const playableSceneLayouts = Array.isArray(playable.sceneLayouts) ? playable.sceneLayouts : [];

  return {
    ...admin,
    ...playable,
    sceneLayouts: adminSceneLayouts.length ? adminSceneLayouts : playableSceneLayouts,
    options: mergeByIndex(adminOptions, playableOptions),
    dropZones: mergeByIndex(adminZones, playableZones),
  };
};

const preferAdminMediaList = (adminItems, playableItems) => {
  if (Array.isArray(adminItems) && adminItems.length) return adminItems;
  if (Array.isArray(playableItems) && playableItems.length) return playableItems;
  return [];
};

const mergePageMediaForBuilder = (adminMedia = {}, playableMedia = {}) => {
  const admin = adminMedia || {};
  const playable = playableMedia || {};
  return {
    ...playable,
    ...admin,
    imageMedia: admin.imageMedia || playable.imageMedia || null,
    audioMedia: admin.audioMedia || playable.audioMedia || null,
    videoMedia: admin.videoMedia || playable.videoMedia || null,
    instructionAudioMedia: admin.instructionAudioMedia || playable.instructionAudioMedia || null,
    backgroundImageMedia: admin.backgroundImageMedia || playable.backgroundImageMedia || null,
    sceneImageMedia: admin.sceneImageMedia || playable.sceneImageMedia || null,
    sceneImageMedias: preferAdminMediaList(admin.sceneImageMedias, playable.sceneImageMedias),
    guideImageMedia: admin.guideImageMedia || playable.guideImageMedia || null,
    guideImageMedias: preferAdminMediaList(admin.guideImageMedias, playable.guideImageMedias),
    sceneImageMediaId: admin.sceneImageMediaId ?? playable.sceneImageMediaId ?? null,
    sceneImageMediaIds: preferAdminMediaList(admin.sceneImageMediaIds, playable.sceneImageMediaIds),
    guideImageMediaId: admin.guideImageMediaId ?? playable.guideImageMediaId ?? null,
    guideImageMediaIds: preferAdminMediaList(admin.guideImageMediaIds, playable.guideImageMediaIds),
  };
};

export const mergeCmsPagesForBuilder = (adminPage = {}, playablePage = null) => {
  if (!playablePage) return adminPage;
  return {
    ...playablePage,
    ...adminPage,
    media: mergePageMediaForBuilder(adminPage.media, playablePage.media),
    interaction: mergeInteractionForBuilder(adminPage.interaction, playablePage.interaction),
  };
};

export const buildCmsLayoutPayload = (interactiveLayouts = {}, { isParallel = false } = {}) => {
  const layouts = interactiveLayouts || {};
  const sceneLayouts = [layouts.sceneOne, isParallel ? layouts.sceneTwo : null]
    .map((item) => normalizeLayoutRect(item))
    .filter(Boolean);

  return {
    sceneLayouts,
    optionOneLayout: normalizeLayoutRect(layouts.optionOne),
    optionTwoLayout: normalizeLayoutRect(layouts.optionTwo),
    answerOneLayout: normalizeLayoutRect(layouts.answerOne),
    answerTwoLayout: isParallel ? normalizeLayoutRect(layouts.answerTwo) : null,
  };
};
