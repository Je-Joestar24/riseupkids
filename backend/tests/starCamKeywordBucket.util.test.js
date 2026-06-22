const {
  normalizeTerm,
  parseKeywordBucketInput,
  normalizeKeywordBucket,
  buildKeywordBucketFields,
} = require('../utils/starCamKeywordBucket.util');

describe('starCamKeywordBucket.util', () => {
  it('parseKeywordBucketInput parses JSON string', () => {
    expect(parseKeywordBucketInput('{"primary":"apple","terms":["apple","fruit"]}')).toEqual({
      primary: 'apple',
      terms: ['apple', 'fruit'],
    });
  });

  it('normalizeKeywordBucket dedupes and caps terms', () => {
    expect(
      normalizeKeywordBucket({
        target: 'apple',
        terms: ['Apple', 'fruit', 'apple', 'produce'],
      })
    ).toEqual({
      primary: 'apple',
      terms: ['apple', 'fruit', 'produce'],
    });
  });

  it('buildKeywordBucketFields returns null without terms', () => {
    expect(buildKeywordBucketFields({ target: '', keywordBucket: { terms: [] } })).toBeNull();
  });
});
