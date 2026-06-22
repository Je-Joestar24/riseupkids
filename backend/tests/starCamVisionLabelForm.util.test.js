const {
  normalizeVisionTarget,
  toLabelSelection,
  buildAddCustomOption,
  ADD_CUSTOM_OPTION_PREFIX,
} = require('../utils/starCamVisionLabelForm.util');

describe('starCamVisionLabelForm.util', () => {
  it('normalizeVisionTarget lowercases and strips punctuation', () => {
    expect(normalizeVisionTarget('Eye Glasses!')).toBe('eye glasses');
  });

  it('toLabelSelection maps API label to form selection', () => {
    expect(
      toLabelSelection({
        labelId: '/m/0c9ph5',
        displayName: 'Apple',
        searchKey: 'apple',
        source: 'oidv7',
      })
    ).toEqual({
      labelId: '/m/0c9ph5',
      displayName: 'Apple',
      target: 'apple',
      source: 'oidv7',
      defaultTerms: [],
    });
  });

  it('buildAddCustomOption prefixes add-custom sentinel id', () => {
    const option = buildAddCustomOption('Plush Bear');
    expect(option.isAddCustom).toBe(true);
    expect(option.labelId).toBe(`${ADD_CUSTOM_OPTION_PREFIX}Plush Bear`);
  });
});
