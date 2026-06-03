export const CMS_DESIGN_WIDTH = 1920;
export const CMS_DESIGN_HEIGHT = 1080;

export type LayoutRect = {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const normalizeLayoutRect = (rect?: Partial<LayoutRect> | null): LayoutRect | null => {
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

export const hasCustomInteractiveLayout = (page: Record<string, unknown> = {}): boolean => {
  const interaction = (page?.interaction ?? {}) as Record<string, unknown>;
  const sceneLayouts = Array.isArray(interaction.sceneLayouts) ? interaction.sceneLayouts : [];
  if (sceneLayouts.some((item) => normalizeLayoutRect(item as LayoutRect))) return true;

  const options = Array.isArray(interaction.options) ? interaction.options : [];
  if (options.some((option) => normalizeLayoutRect((option as { layout?: LayoutRect })?.layout))) return true;

  const dropZones = Array.isArray(interaction.dropZones) ? interaction.dropZones : [];
  if (dropZones.some((zone) => normalizeLayoutRect((zone as { layout?: LayoutRect })?.layout))) return true;

  return false;
};

const pct = (px: number, total: number) => Number(((px / total) * 100).toFixed(3));

export const getDefaultInteractiveLayouts = (isParallel = false) => {
  const cardW = isParallel ? pct(315, CMS_DESIGN_WIDTH) : pct(320, CMS_DESIGN_WIDTH);
  const cardH = isParallel ? pct(238, CMS_DESIGN_HEIGHT) : pct(272, CMS_DESIGN_HEIGHT);
  const gap = pct(96, CMS_DESIGN_WIDTH);
  const optionStartX = pct((CMS_DESIGN_WIDTH - (320 * 2 + 96)) / 2, CMS_DESIGN_WIDTH);
  const parallelOptionStartX = pct((CMS_DESIGN_WIDTH - (315 * 2 + 96)) / 2, CMS_DESIGN_WIDTH);
  const startX = isParallel ? parallelOptionStartX : optionStartX;
  const optionY = isParallel
    ? pct(CMS_DESIGN_HEIGHT - 238 - 96, CMS_DESIGN_HEIGHT)
    : pct((CMS_DESIGN_HEIGHT - 272) / 2, CMS_DESIGN_HEIGHT);
  const answerY = isParallel ? pct(56 - (238 / CMS_DESIGN_HEIGHT) * 50, CMS_DESIGN_HEIGHT) : 45.4;

  return {
    sceneOne: isParallel
      ? { xPct: 6, yPct: 10, wPct: 38, hPct: 32 }
      : { xPct: 8, yPct: 10, wPct: 34, hPct: 30 },
    sceneTwo: isParallel ? { xPct: 56, yPct: 10, wPct: 38, hPct: 32 } : null,
    answerOne: {
      xPct: isParallel ? 50 - cardW : 50 - cardW / 2,
      yPct: answerY,
      wPct: cardW,
      hPct: cardH,
    },
    answerTwo: isParallel
      ? { xPct: 50 + gap / 2, yPct: answerY, wPct: cardW, hPct: cardH }
      : null,
    optionOne: { xPct: startX, yPct: optionY, wPct: cardW, hPct: cardH },
    optionTwo: { xPct: startX + cardW + gap, yPct: optionY, wPct: cardW, hPct: cardH },
  };
};

export const buildInteractiveLayoutsFromInteraction = (page: Record<string, unknown> = {}) => {
  const isParallel =
    page.type === 'activity_drag_2x2'
    || (page?.interaction as { kind?: string })?.kind === 'drag_2x2'
    || page.interactionMode === 'two_options_two_answers';
  const defaults = getDefaultInteractiveLayouts(Boolean(isParallel));
  const interaction = (page?.interaction ?? {}) as Record<string, unknown>;
  const options = Array.isArray(interaction.options) ? interaction.options : [];
  const dropZones = Array.isArray(interaction.dropZones) ? interaction.dropZones : [];
  const sceneLayouts = Array.isArray(interaction.sceneLayouts) ? interaction.sceneLayouts : [];
  const pick = (custom: unknown, fallback: LayoutRect | null) =>
    normalizeLayoutRect(custom as LayoutRect) || fallback;

  return {
    sceneOne: pick(sceneLayouts[0], defaults.sceneOne),
    sceneTwo: isParallel ? pick(sceneLayouts[1], defaults.sceneTwo) : null,
    answerOne: pick((dropZones[0] as { layout?: LayoutRect })?.layout, defaults.answerOne),
    answerTwo: isParallel
      ? pick((dropZones[1] as { layout?: LayoutRect })?.layout, defaults.answerTwo)
      : null,
    optionOne: pick((options[0] as { layout?: LayoutRect })?.layout, defaults.optionOne),
    optionTwo: pick((options[1] as { layout?: LayoutRect })?.layout, defaults.optionTwo),
  };
};

export const extractInteractiveLayoutsFromCms = (page: Record<string, unknown> = {}) => {
  const isParallel =
    page.type === 'activity_drag_2x2'
    || (page?.interaction as { kind?: string })?.kind === 'drag_2x2'
    || page.interactionMode === 'two_options_two_answers';
  const defaults = getDefaultInteractiveLayouts(Boolean(isParallel));
  if (!hasCustomInteractiveLayout(page)) {
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

export const layoutRectToPx = (
  rect: LayoutRect | null | undefined,
  stageWidth: number,
  stageHeight: number
) => {
  const safe = normalizeLayoutRect(rect);
  if (!safe) return null;
  return {
    left: (safe.xPct / 100) * stageWidth,
    top: (safe.yPct / 100) * stageHeight,
    width: (safe.wPct / 100) * stageWidth,
    height: (safe.hPct / 100) * stageHeight,
  };
};
