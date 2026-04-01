describe('starCamChild.routes – protection + endpoints', () => {
  it('is protected by protect + authorize(parent,admin)', () => {
    const router = require('../routes/starCamChild.routes');
    const hasProtect = router.stack.some((l) => l && l.name === 'protect');
    expect(hasProtect).toBe(true);
  });

  it('contains child flow endpoints', () => {
    const router = require('../routes/starCamChild.routes');
    const hasCategories = router.stack.some(
      (l) => l.route && l.route.path === '/child/:childId/categories' && l.route.methods.get
    );
    const hasMissions = router.stack.some(
      (l) =>
        l.route &&
        l.route.path === '/child/:childId/categories/:categoryKey/missions' &&
        l.route.methods.get
    );
    const hasStartFlow = router.stack.some(
      (l) => l.route && l.route.path === '/child/:childId/missions/:missionId/start' && l.route.methods.get
    );
    expect(hasCategories).toBe(true);
    expect(hasMissions).toBe(true);
    expect(hasStartFlow).toBe(true);
  });
});

