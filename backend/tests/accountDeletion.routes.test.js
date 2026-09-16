describe('account deletion routes – protection', () => {
  it('POST /api/auth/delete-account requires protect middleware', () => {
    const router = require('../routes/auth.routes');
    const layer = router.stack.find(
      (l) => l.route && l.route.path === '/delete-account' && l.route.methods.post
    );
    expect(layer).toBeTruthy();
    expect(layer.route.stack[0].handle.name).toBe('protect');
    expect(layer.route.stack[1].handle.name).toBe('deleteAccount');
  });

  it('POST /api/children/:id/request-deletion requires protect + authorize(parent)', () => {
    const router = require('../routes/children.routes');
    const layer = router.stack.find(
      (l) => l.route && l.route.path === '/:id/request-deletion' && l.route.methods.post
    );
    expect(layer).toBeTruthy();
    expect(layer.route.stack[0].handle.name).toBe('requestChildDeletion');
  });

  it('children router applies protect and authorize(parent) globally', () => {
    const router = require('../routes/children.routes');
    const globalMiddleware = router.stack.filter((l) => !l.route).map((l) => l.handle.name);
    expect(globalMiddleware).toContain('protect');
    expect(globalMiddleware.some((name) => name === '')).toBe(true);
  });

  it('admin deletion routes require protect + authorize(admin)', () => {
    const router = require('../routes/accountDeletion.routes');
    const globalMiddleware = router.stack.filter((l) => !l.route).map((l) => l.handle.name);
    expect(globalMiddleware[0]).toBe('protect');
    expect(globalMiddleware[1]).toBe('');
  });

  it('admin POST /:id/execute maps to executeDeletionRequest, gated by step-up auth (Chunk 10 — "deletion overrides")', () => {
    const router = require('../routes/accountDeletion.routes');
    const layer = router.stack.find(
      (l) => l.route && l.route.path === '/:id/execute' && l.route.methods.post
    );
    expect(layer).toBeTruthy();
    const handlerNames = layer.route.stack.map((l) => l.handle.name);
    expect(handlerNames).toEqual(['requireStepUp', 'executeDeletionRequest']);
  });

  it('admin POST /execute-pending is also gated by step-up auth (the "bulk" deletion override)', () => {
    const router = require('../routes/accountDeletion.routes');
    const layer = router.stack.find(
      (l) => l.route && l.route.path === '/execute-pending' && l.route.methods.post
    );
    expect(layer).toBeTruthy();
    const handlerNames = layer.route.stack.map((l) => l.handle.name);
    expect(handlerNames).toEqual(['requireStepUp', 'executeAllPendingDeletionRequests']);
  });
});
