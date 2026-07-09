/**
 * CMS content reading — newline-aware line grouping for karaoke playback.
 */

export function normalizeReadingText(text = '') {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function splitReadingLines(text = '') {
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

export function assignLineIndicesToWords(words = [], text = '') {
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

/** Groups timed words by lineIndex for one-line-at-a-time playback. */
export function groupReadingWordsByLine(words = [], text = '') {
  const withLines = assignLineIndicesToWords(words, text);
  const groups = new Map();

  withLines.forEach((word) => {
    const lineIndex = Number(word?.lineIndex) || 0;
    if (!groups.has(lineIndex)) {
      groups.set(lineIndex, []);
    }
    groups.get(lineIndex).push(word);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([lineIndex, lineWords]) => ({
      lineIndex,
      words: lineWords.sort((a, b) => Number(a.start) - Number(b.start)),
    }));
}

/** Active line from playback time; -1 when between lines (erased). */
export function getActiveReadingLineIndex(timeSec, lineGroups = []) {
  if (!lineGroups.length || !Number.isFinite(timeSec)) return -1;
  const t = Math.max(0, timeSec);

  for (let i = 0; i < lineGroups.length; i += 1) {
    const lineWords = lineGroups[i]?.words || [];
    if (!lineWords.length) continue;
    const start = Number(lineWords[0]?.start);
    const end = Number(lineWords[lineWords.length - 1]?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (t >= start && t <= end + 0.001) {
      return i;
    }
  }

  return -1;
}

/** Next line that has not started yet (for editor/player preview between lines). */
export function getUpcomingReadingLineIndex(timeSec, lineGroups = []) {
  if (!lineGroups.length || !Number.isFinite(timeSec)) return -1;
  const t = Math.max(0, timeSec);

  for (let i = 0; i < lineGroups.length; i += 1) {
    const lineWords = lineGroups[i]?.words || [];
    if (!lineWords.length) continue;
    const start = Number(lineWords[0]?.start);
    if (Number.isFinite(start) && t < start) {
      return i;
    }
  }

  return -1;
}

/** Word highlight index within the currently visible line only. */
export function getActiveReadingWordIndexInLine(timeSec, lineWords = []) {
  if (!lineWords.length || !Number.isFinite(timeSec)) return -1;
  const t = Math.max(0, timeSec);

  for (let i = 0; i < lineWords.length; i += 1) {
    const start = Number(lineWords[i]?.start);
    const end = Number(lineWords[i]?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const isLast = i === lineWords.length - 1;
    if (t >= start && (isLast ? t <= end + 0.001 : t < end)) {
      return i;
    }
  }

  return -1;
}

export const CMS_READING_LINE_ERASE_MS = 180;
