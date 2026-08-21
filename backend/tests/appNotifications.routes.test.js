const { authorize } = require('../middleware/auth');

function invokeAuthorize(...roles) {
  const middleware = authorize('parent', 'admin');
  const req = { user: roles[0] ? { role: roles[0] } : undefined };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();
  middleware(req, res, next);
  return { req, res, next };
}

describe('appNotifications.routes – parent device token endpoints', () => {
  const router = require('../routes/appNotifications.routes');

  it('is protected by protect + parent/admin authorize', () => {
    const globalMiddleware = router.stack.filter((layer) => !layer.route).map((layer) => layer.name);
    expect(globalMiddleware).toContain('protect');

    const teacher = invokeAuthorize('teacher');
    expect(teacher.next).not.toHaveBeenCalled();
    expect(teacher.res.status).toHaveBeenCalledWith(403);

    const parent = invokeAuthorize('parent');
    expect(parent.next).toHaveBeenCalledTimes(1);

    const admin = invokeAuthorize('admin');
    expect(admin.next).toHaveBeenCalledTimes(1);
  });

  it('registers and removes device tokens', () => {
    const has = (path, method) =>
      router.stack.some((layer) => layer.route && layer.route.path === path && layer.route.methods[method]);

    expect(has('/device-tokens', 'post')).toBe(true);
    expect(has('/device-tokens', 'delete')).toBe(true);
  });
});
