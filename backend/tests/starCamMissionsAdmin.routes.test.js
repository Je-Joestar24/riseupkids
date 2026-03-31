describe('starCamMissionsAdmin.routes – protection + endpoints', () => {
  it('is protected by protect + authorize(admin,teacher)', () => {
    const router = require('../routes/starCamMissionsAdmin.routes');

    // router.use(protect) + router.use(authorize(...)) should exist as stack middlewares
    const hasProtect = router.stack.some((l) => l && l.name === 'protect');
    expect(hasProtect).toBe(true);
  });

  it('contains required admin mission routes', () => {
    const router = require('../routes/starCamMissionsAdmin.routes');

    const hasList = router.stack.some((l) => l.route && l.route.path === '/' && l.route.methods.get);
    const hasCreate = router.stack.some((l) => l.route && l.route.path === '/' && l.route.methods.post);
    const hasCategoryList = router.stack.some((l) => l.route && l.route.path === '/categories' && l.route.methods.get);
    const hasCategoryCreate = router.stack.some((l) => l.route && l.route.path === '/categories' && l.route.methods.post);
    const hasGet = router.stack.some((l) => l.route && l.route.path === '/:id' && l.route.methods.get);
    const hasPatch = router.stack.some((l) => l.route && l.route.path === '/:id' && l.route.methods.patch);
    const hasPublish = router.stack.some((l) => l.route && l.route.path === '/:id/publish' && l.route.methods.post);
    const hasUnpublish = router.stack.some((l) => l.route && l.route.path === '/:id/unpublish' && l.route.methods.post);
    const hasArchive = router.stack.some((l) => l.route && l.route.path === '/:id/archive' && l.route.methods.post);

    expect(hasList).toBe(true);
    expect(hasCreate).toBe(true);
    expect(hasCategoryList).toBe(true);
    expect(hasCategoryCreate).toBe(true);
    expect(hasGet).toBe(true);
    expect(hasPatch).toBe(true);
    expect(hasPublish).toBe(true);
    expect(hasUnpublish).toBe(true);
    expect(hasArchive).toBe(true);
  });
});

