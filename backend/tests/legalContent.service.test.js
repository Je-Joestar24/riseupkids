const legalContent = require('../services/legalContent.service');

describe('legalContent.service', () => {
  beforeEach(() => {
    legalContent.resetLegalContentCache();
  });

  it('returns production terms text (not placeholder)', () => {
    const result = legalContent.getTermsContent();

    expect(result.content).toContain('Terms of Use');
    expect(result.content).toContain('COPPA');
    expect(result.content).not.toMatch(/Lorem ipsum/i);
    expect(result.version).toBe('2026-07-14');
    expect(result.termsUrl).toBe('https://riseup.kids/terms');
    expect(result.privacyUrl).toBe('https://riseup.kids/privacy');
  });

  it('returns privacy URLs for clients', () => {
    const urls = legalContent.getPrivacyUrls();
    expect(urls.contactEmail).toBe('contact@riseup.kids');
    expect(urls.privacyUrl).toContain('riseup.kids');
  });
});
