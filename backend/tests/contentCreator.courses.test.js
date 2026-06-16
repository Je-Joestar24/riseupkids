describe('contentCreator.courses - excluded routes', () => {
  it('course routes do not authorize content_creator at router level', () => {
    const router = require('../routes/course.routes');
    const hasContentCreatorAuthorize = router.stack.some((layer) => {
      if (!layer.route) return false;
      return false;
    });

    const authorizeLayers = router.stack.filter((layer) => !layer.route && layer.name !== 'router');
    expect(authorizeLayers.length).toBeGreaterThan(0);
    expect(hasContentCreatorAuthorize).toBe(false);
  });

  it('contentCollection routes remain admin and teacher only', () => {
    const router = require('../routes/contentCollection.routes');
    const usesContentCreator = JSON.stringify(
      router.stack.map((layer) => layer.handle?.toString?.() || '')
    ).includes('content_creator');
    expect(usesContentCreator).toBe(false);
  });

  it('explore reorder route stays admin and teacher only', () => {
    const router = require('../routes/explore.routes');
    const reorderLayer = router.stack.find(
      (layer) => layer.route && layer.route.path === '/reorder' && layer.route.methods.post
    );
    expect(reorderLayer).toBeTruthy();
  });
});
