const authService = require('../services/auth.services');

describe('auth.services getTermsContent', () => {
  it('returns final terms copy aligned with legal/meta.json', async () => {
    const result = await authService.getTermsContent();

    expect(result.content).toContain('Terms of Use');
    expect(result.content).not.toMatch(/Lorem ipsum/i);
    expect(result.version).toBe('2026-08-01');
    expect(result.content).toContain('Android app and Web only');
    expect(result.termsUrl).toBe('https://riseup.kids/terms');
  });
});
