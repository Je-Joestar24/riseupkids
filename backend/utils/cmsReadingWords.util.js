/**
 * CMS content-page reading helpers: newline-aware word timings with lineIndex.
 */

function normalizeReadingText(text = '') {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function splitReadingLines(text = '') {
  return normalizeReadingText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function tokenizeLine(line = '') {
  return String(line)
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildWeightedWords(text, durationSec) {
  const lines = splitReadingLines(text);
  const tokensWithLine = [];

  lines.forEach((line, lineIndex) => {
    tokenizeLine(line).forEach((token) => {
      tokensWithLine.push({ w: token, lineIndex });
    });
  });

  const duration = Number(durationSec);
  if (!tokensWithLine.length || !Number.isFinite(duration) || duration <= 0) return [];

  const weights = tokensWithLine.map((token) => Math.max(String(token.w).length, 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!totalWeight) return [];

  let cursor = 0;
  return tokensWithLine.map((token, index) => {
    const raw = (weights[index] / totalWeight) * duration;
    const end =
      index === tokensWithLine.length - 1 ? duration : Math.min(duration, cursor + raw);
    const segment = {
      w: token.w,
      lineIndex: token.lineIndex,
      start: Number(cursor.toFixed(3)),
      end: Number(end.toFixed(3)),
    };
    cursor = end;
    return segment;
  });
}

function assignLineIndicesToWords(words = [], text = '') {
  if (!Array.isArray(words) || !words.length) return [];

  const hasExplicitLineIndex = words.some((word) => Number.isFinite(Number(word?.lineIndex)));
  if (hasExplicitLineIndex) {
    return words.map((word) => ({
      ...word,
      lineIndex: Math.max(0, Number(word?.lineIndex) || 0),
    }));
  }

  const lineTokenCounts = splitReadingLines(text).map((line) => tokenizeLine(line).length);
  if (!lineTokenCounts.length) {
    return words.map((word) => ({ ...word, lineIndex: 0 }));
  }

  let lineIdx = 0;
  let posInLine = 0;

  return words.map((word) => {
    const lineIndex = Math.min(lineIdx, lineTokenCounts.length - 1);
    posInLine += 1;
    if (lineIdx < lineTokenCounts.length - 1 && posInLine >= lineTokenCounts[lineIdx]) {
      lineIdx += 1;
      posInLine = 0;
    }
    return { ...word, lineIndex };
  });
}

function normalizeReadingWordsForOutput(words = [], text = '') {
  const withLines = assignLineIndicesToWords(words, text);
  return withLines
    .map((word) => ({
      w: String(word?.w || '').trim(),
      start: Number(word?.start),
      end: Number(word?.end),
      lineIndex: Number(word?.lineIndex) || 0,
    }))
    .filter((word) => word.w && Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start);
}

module.exports = {
  normalizeReadingText,
  splitReadingLines,
  buildWeightedWords,
  assignLineIndicesToWords,
  normalizeReadingWordsForOutput,
};
