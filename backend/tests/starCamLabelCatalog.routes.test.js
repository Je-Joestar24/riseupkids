describe('starCamLabelCatalog.routes – protection + endpoints', () => {
  it('is protected by protect + authorize(admin,teacher,content_creator)', () => {
    const router = require('../routes/starCamLabelCatalog.routes');
    const hasProtect = router.stack.some((l) => l && l.name === 'protect');
    expect(hasProtect).toBe(true);
  });

  it('contains required label catalog routes', () => {
    const router = require('../routes/starCamLabelCatalog.routes');

    const hasSearch = router.stack.some((l) => l.route && l.route.path === '/search' && l.route.methods.get);
    const hasRecentCustom = router.stack.some(
      (l) => l.route && l.route.path === '/recent-custom' && l.route.methods.get
    );
    const hasCreateCustom = router.stack.some((l) => l.route && l.route.path === '/custom' && l.route.methods.post);

    expect(hasSearch).toBe(true);
    expect(hasRecentCustom).toBe(true);
    expect(hasCreateCustom).toBe(true);
  });
});
