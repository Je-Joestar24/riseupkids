describe('cmsBookPlayer.routes - endpoints', () => {
  it('contains required parent cms-book player routes', () => {
    const router = require('../routes/cmsBookPlayer.routes');

    const hasPlayableList = router.stack.some(
      (l) => l.route && l.route.path === '/playable' && l.route.methods.get
    );
    const hasPlayableById = router.stack.some(
      (l) => l.route && l.route.path === '/:id/play' && l.route.methods.get
    );

    expect(hasPlayableList).toBe(true);
    expect(hasPlayableById).toBe(true);
  });
});
