import {
  getActiveReadingWordIndexInLine,
  resolveCmsContentDisplayLineIndex,
  type ReadingLineGroup,
} from '@/components/child/common/cms-player-shared';

const lines: ReadingLineGroup[] = [
  {
    lineIndex: 0,
    words: [
      { w: 'Hello', start: 0, end: 0.5 },
      { w: 'there', start: 0.5, end: 1 },
    ],
  },
  {
    lineIndex: 1,
    words: [
      { w: 'Last', start: 1.5, end: 2 },
      { w: 'line', start: 2, end: 2.5 },
    ],
  },
];

describe('resolveCmsContentDisplayLineIndex', () => {
  it('returns the active line during its window', () => {
    expect(resolveCmsContentDisplayLineIndex(0.7, lines)).toBe(0);
    expect(resolveCmsContentDisplayLineIndex(2.1, lines)).toBe(1);
  });

  it('erases between cutted lines', () => {
    expect(resolveCmsContentDisplayLineIndex(1.2, lines)).toBe(-1);
  });

  it('holds the last line after the final timing ends', () => {
    expect(resolveCmsContentDisplayLineIndex(3, lines)).toBe(1);
  });

  it('holds the last line when audioFinished even near the end boundary', () => {
    expect(
      resolveCmsContentDisplayLineIndex(2.5, lines, { audioFinished: true })
    ).toBe(1);
  });

  it('still catches very short lines via min visible window', () => {
    const shortLines: ReadingLineGroup[] = [
      {
        lineIndex: 0,
        words: [{ w: 'Hi', start: 0.1, end: 0.13 }],
      },
    ];
    // 30ms authored window — still visible at t=0.18 because of min line pad
    expect(resolveCmsContentDisplayLineIndex(0.18, shortLines)).toBe(0);
  });
});

describe('getActiveReadingWordIndexInLine', () => {
  it('highlights short words that progress ticks may skip', () => {
    const words = [
      { w: 'a', start: 0, end: 0.03 },
      { w: 'big', start: 0.03, end: 0.4 },
    ];
    // Tick lands after tiny first word ended but before second start pad resolves
    expect(getActiveReadingWordIndexInLine(0.04, words)).toBeGreaterThanOrEqual(0);
    expect(getActiveReadingWordIndexInLine(0.02, words)).toBe(0);
  });

  it('uses sticky selection across word boundaries', () => {
    const words = [
      { w: 'one', start: 0, end: 0.2 },
      { w: 'two', start: 0.2, end: 0.4 },
    ];
    expect(getActiveReadingWordIndexInLine(0.25, words)).toBe(1);
  });
});
