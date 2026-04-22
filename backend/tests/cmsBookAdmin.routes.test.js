describe('cmsBookAdmin.routes - endpoints', () => {
  it('contains required admin cms-book routes', () => {
    const router = require('../routes/cmsBookAdmin.routes');

    const hasCreate = router.stack.some((l) => l.route && l.route.path === '/' && l.route.methods.post);
    const hasList = router.stack.some((l) => l.route && l.route.path === '/' && l.route.methods.get);
    const hasGetOne = router.stack.some((l) => l.route && l.route.path === '/:id' && l.route.methods.get);
    const hasUpdate = router.stack.some((l) => l.route && l.route.path === '/:id' && l.route.methods.put);
    const hasPublish = router.stack.some(
      (l) => l.route && l.route.path === '/:id/publish' && l.route.methods.patch
    );
    const hasUnpublish = router.stack.some(
      (l) => l.route && l.route.path === '/:id/unpublish' && l.route.methods.patch
    );
    const hasArchive = router.stack.some(
      (l) => l.route && l.route.path === '/:id/archive' && l.route.methods.patch
    );

    expect(hasCreate).toBe(true);
    expect(hasList).toBe(true);
    expect(hasGetOne).toBe(true);
    expect(hasUpdate).toBe(true);
    expect(hasPublish).toBe(true);
    expect(hasUnpublish).toBe(true);
    expect(hasArchive).toBe(true);
  });
});
