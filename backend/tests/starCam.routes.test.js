describe('starCam.routes – protection', () => {
  it('POST /events/round-started is protected by protect + authorize(parent,admin)', () => {
    const router = require('../routes/starCam.routes');

    const layer = router.stack.find(
      (l) => l.route && l.route.path === '/events/round-started' && l.route.methods.post
    );
    expect(layer).toBeTruthy();
    expect(layer.route.stack).toHaveLength(3);
    expect(layer.route.stack[0].handle.name).toBe('protect');
    expect(layer.route.stack[1].handle.name).toBe('');
    expect(layer.route.stack[2].handle.name).toBe('trackRoundStarted');
  });

  it('GET /events is protected by protect + authorize(parent,admin)', () => {
    const router = require('../routes/starCam.routes');

    const layer = router.stack.find(
      (l) => l.route && l.route.path === '/events' && l.route.methods.get
    );
    expect(layer).toBeTruthy();
    expect(layer.route.stack).toHaveLength(3);
    expect(layer.route.stack[0].handle.name).toBe('protect');
    expect(layer.route.stack[1].handle.name).toBe('');
    expect(layer.route.stack[2].handle.name).toBe('getStarCamEvents');
  });

  it('GET /missions is protected by protect + authorize(parent,admin)', () => {
    const router = require('../routes/starCam.routes');

    const layer = router.stack.find(
      (l) => l.route && l.route.path === '/missions' && l.route.methods.get
    );
    expect(layer).toBeTruthy();
    expect(layer.route.stack).toHaveLength(3);
    expect(layer.route.stack[0].handle.name).toBe('protect');
    expect(layer.route.stack[1].handle.name).toBe('');
    expect(layer.route.stack[2].handle.name).toBe('getStarCamMissions');
  });
});
