const { authorize } = require('../middleware/auth');

function invokeAuthorize(role) {
  const middleware = authorize('admin');
  const req = { user: role ? { role } : undefined };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();
  middleware(req, res, next);
  return { req, res, next };
}

describe('adminNotifications.routes – protection + endpoints', () => {
  const router = require('../routes/adminNotifications.routes');

  it('is protected by protect + authorize(admin) (1.6)', () => {
    const globalMiddleware = router.stack.filter((layer) => !layer.route).map((layer) => layer.name);
    expect(globalMiddleware).toContain('protect');

    const parent = invokeAuthorize('parent');
    expect(parent.next).not.toHaveBeenCalled();
    expect(parent.res.status).toHaveBeenCalledWith(403);

    const teacher = invokeAuthorize('teacher');
    expect(teacher.next).not.toHaveBeenCalled();
    expect(teacher.res.status).toHaveBeenCalledWith(403);

    const admin = invokeAuthorize('admin');
    expect(admin.next).toHaveBeenCalledTimes(1);
    expect(admin.res.status).not.toHaveBeenCalled();
  });

  it('contains required admin notification routes', () => {
    const has = (path, method) =>
      router.stack.some((layer) => layer.route && layer.route.path === path && layer.route.methods[method]);

    expect(has('/meta', 'get')).toBe(true);
    expect(has('/images', 'post')).toBe(true);
    expect(has('/', 'get')).toBe(true);
    expect(has('/', 'post')).toBe(true);
    expect(has('/:id', 'get')).toBe(true);
    expect(has('/:id', 'patch')).toBe(true);
    expect(has('/:id/duplicate', 'post')).toBe(true);
    expect(has('/:id/preview', 'get')).toBe(true);
  });
});
