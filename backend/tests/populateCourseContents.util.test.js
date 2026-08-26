const { idKey, indexById } = require('../utils/populateCourseContents.util');

describe('populateCourseContents helpers', () => {
  it('normalizes ids to strings', () => {
    expect(idKey(null)).toBe('');
    expect(idKey('abc')).toBe('abc');
    expect(idKey({ toString: () => 'oid' })).toBe('oid');
  });

  it('indexes docs by string id', () => {
    const a = { _id: '1', title: 'A' };
    const b = { _id: '2', title: 'B' };
    expect(indexById([a, b, null])).toEqual({ '1': a, '2': b });
  });
});
