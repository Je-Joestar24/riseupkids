const {
  parseCsvLine,
  cleanDisplayName,
  parseOidLabelCsv,
  normalizeSearchKey,
  slugifyCustomLabelId,
} = require('../utils/oidLabelCsv.util');

describe('oidLabelCsv.util', () => {
  it('parseCsvLine splits two columns without quotes', () => {
    expect(parseCsvLine('/m/0hz5,Aardvark')).toEqual(['/m/0hz5', 'Aardvark']);
  });

  it('parseCsvLine respects quoted DisplayName with commas', () => {
    expect(parseCsvLine('/m/01wdp,"Cucumber, gourd, and melon family"')).toEqual([
      '/m/01wdp',
      'Cucumber, gourd, and melon family',
    ]);
  });

  it('cleanDisplayName strips leading apostrophe artifact', () => {
    expect(cleanDisplayName("'Nduja")).toBe('Nduja');
  });

  it('cleanDisplayName unwraps double-quoted values', () => {
    expect(cleanDisplayName('"Cucumber, gourd, and melon family"')).toBe('Cucumber, gourd, and melon family');
  });

  it('parseOidLabelCsv reads LabelName and DisplayName columns', () => {
    const csv = [
      'LabelName,DisplayName',
      '/m/0c9ph5,Apple',
      '/m/01wdp,"Cucumber, gourd, and melon family"',
      "/m/0c4936,'Nduja",
    ].join('\n');

    const rows = parseOidLabelCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      labelId: '/m/0c9ph5',
      displayName: 'Apple',
      searchKey: 'apple',
    });
    expect(rows[1].displayName).toBe('Cucumber, gourd, and melon family');
    expect(rows[2].displayName).toBe('Nduja');
  });

  it('normalizeSearchKey lowercases and collapses punctuation', () => {
    expect(normalizeSearchKey('Eye Glasses!')).toBe('eye glasses');
  });

  it('slugifyCustomLabelId builds custom label ids', () => {
    expect(slugifyCustomLabelId('Plush Bear')).toBe('custom:plush_bear');
  });
});
