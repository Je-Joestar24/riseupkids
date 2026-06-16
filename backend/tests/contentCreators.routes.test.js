describe('contentCreators.routes - endpoints', () => {
  it('contains required admin content-creator routes', () => {
    const router = require('../routes/contentCreators.routes');

    const hasList = router.stack.some((l) => l.route && l.route.path === '/' && l.route.methods.get);
    const hasCreate = router.stack.some((l) => l.route && l.route.path === '/' && l.route.methods.post);
    const hasGetOne = router.stack.some((l) => l.route && l.route.path === '/:id' && l.route.methods.get);
    const hasUpdate = router.stack.some((l) => l.route && l.route.path === '/:id' && l.route.methods.put);
    const hasArchive = router.stack.some((l) => l.route && l.route.path === '/:id' && l.route.methods.delete);
    const hasRestore = router.stack.some(
      (l) => l.route && l.route.path === '/:id/restore' && l.route.methods.put
    );

    expect(hasList).toBe(true);
    expect(hasCreate).toBe(true);
    expect(hasGetOne).toBe(true);
    expect(hasUpdate).toBe(true);
    expect(hasArchive).toBe(true);
    expect(hasRestore).toBe(true);
  });

  it('uses protect and admin authorize middleware', () => {
    const router = require('../routes/contentCreators.routes');
    const middlewareNames = router.stack
      .filter((layer) => !layer.route)
      .map((layer) => layer.name);

    expect(middlewareNames).toContain('protect');
  });
});
