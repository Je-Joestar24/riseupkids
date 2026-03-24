/**
 * Program Materials config (MVP)
 *
 * Phase 1 uses static config so PDFs can be served immediately.
 * Phase 2 can move this mapping to a DB model managed by admin UI.
 */

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

const MAX_STEP = parsePositiveInt(process.env.PROGRAM_MATERIALS_MAX_STEP, 4);
const PAGES_PER_STEP = parsePositiveInt(process.env.PROGRAM_MATERIALS_PAGES_PER_STEP, 3);

/**
 * Base URL for program materials files.
 * Example: https://cdn.riseupkids.com/program-materials/v2026-03-18
 *
 * If not provided, URLs below must be absolute in stepPdfUrls/bundle/recipes.
 */
const BASE_URL = (process.env.PROGRAM_MATERIALS_BASE_URL || '').trim();
const AHEAD_STEPS = parsePositiveInt(process.env.PROGRAM_MATERIALS_AHEAD_STEPS, 1);

function joinUrl(base, path) {
  // If we don't have a real base URL yet, treat files as "not uploaded"
  // and return null so the UI won't render broken download links.
  if (!base) return null;
  const b = String(base).replace(/\/+$/, '');
  const p = String(path).replace(/^\/+/, '');
  return `${b}/${p}`;
}

function buildStepPdfUrl(stepNumber) {
  if (!stepNumber || Number(stepNumber) < 1) return null;
  return joinUrl(BASE_URL, `steps/step-${String(stepNumber).padStart(2, '0')}.pdf`);
}

function buildStepPrintablePageUrl(stepNumber, pageNumber) {
  if (!stepNumber || Number(stepNumber) < 1) return null;
  if (!pageNumber || Number(pageNumber) < 1) return null;
  return joinUrl(
    BASE_URL,
    `steps/step-${String(stepNumber).padStart(2, '0')}/page-${String(pageNumber).padStart(2, '0')}.pdf`
  );
}

function buildStepPrintables(stepNumber) {
  if (!stepNumber || Number(stepNumber) < 1) return [];
  const printables = [];
  for (let page = 1; page <= PAGES_PER_STEP; page += 1) {
    printables.push({
      id: `step-${Number(stepNumber)}-page-${page}`,
      label: `Page ${page}`,
      pageNumber: page,
      fileUrl: buildStepPrintablePageUrl(stepNumber, page),
    });
  }
  return printables;
}

function buildFullBundleUrl() {
  return joinUrl(BASE_URL, 'bundles/full-bundle.pdf');
}

function buildRecipesUrl() {
  return joinUrl(BASE_URL, 'recipes/recipes.pdf');
}

/**
 * Step PDF URLs.
 *
 * - Keys are step numbers: 1..MAX_STEP
 * - Values can be absolute URLs, or relative paths (when BASE_URL is set)
 */
const stepPdfUrls = {};
for (let step = 1; step <= MAX_STEP; step += 1) {
  stepPdfUrls[step] = buildStepPdfUrl(step);
}

const fullBundleUrl = buildFullBundleUrl();
const recipesUrl = buildRecipesUrl();

module.exports = {
  MAX_STEP,
  AHEAD_STEPS,
  PAGES_PER_STEP,
  BASE_URL,
  buildStepPdfUrl,
  buildStepPrintablePageUrl,
  buildStepPrintables,
  buildFullBundleUrl,
  buildRecipesUrl,
  stepPdfUrls,
  fullBundleUrl,
  recipesUrl,
};

