describe('programMaterials.routes – protection', () => {
  it('GET /children/:childId is protected by protect + authorize(parent, admin)', () => {
    const router = require('../routes/programMaterials.routes');

    const layer = router.stack.find(
      (l) => l.route && l.route.path === '/children/:childId' && l.route.methods.get
    );
    expect(layer).toBeTruthy();

    // Express stores middlewares in order. authorize(...) is anonymous.
    expect(layer.route.stack).toHaveLength(3);
    expect(layer.route.stack[0].handle.name).toBe('protect');
    expect(layer.route.stack[1].handle.name).toBe(''); // authorize('parent','admin')
    expect(layer.route.stack[2].handle.name).toBe('getProgramMaterialsForChild');
  });
});

