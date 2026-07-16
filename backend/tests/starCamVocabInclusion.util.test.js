const {
  isVocabIncluded,
  filterIncludedVocab,
  countIncludedVocab,
  canToggleVocabInclusion,
} = require('../utils/starCamVocabInclusion.util');

describe('starCamVocabInclusion.util', () => {
  const sampleVocab = [
    { sortOrder: 0, target: 'book', isIncluded: true },
    { sortOrder: 1, target: 'chair', isIncluded: true },
    { sortOrder: 2, target: 'cup', isIncluded: true },
    { sortOrder: 3, target: 'ball', isIncluded: true },
    { sortOrder: 4, target: 'tree', isIncluded: false },
    { sortOrder: 5, target: 'car', isIncluded: false },
    { sortOrder: 6, target: 'dog', isIncluded: false },
  ];

  it('counts included vocabulary only', () => {
    expect(countIncludedVocab(sampleVocab)).toBe(4);
    expect(filterIncludedVocab(sampleVocab)).toHaveLength(4);
  });

  it('treats missing isIncluded as included for backward compatibility', () => {
    expect(isVocabIncluded({ target: 'book' })).toBe(true);
  });

  it('blocks unchecking when only 4 objects remain included', () => {
    const result = canToggleVocabInclusion(sampleVocab, 0, false);
    expect(result.allowed).toBe(false);
  });

  it('allows checking an excluded vocabulary entry', () => {
    const result = canToggleVocabInclusion(sampleVocab, 4, true);
    expect(result.allowed).toBe(true);
  });
});
