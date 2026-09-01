/**
 * RUK-SEC-001 — GET /api/scorm/:contentId/wrapper must require a valid token and must never
 * read a file outside backend/uploads/scorm, no matter what `path`/`entryPoint` the caller sends.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-001
 */
const path = require('path');

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readFile: jest.fn(),
}));
jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

const fs = require('fs-extra');
const jwt = require('jsonwebtoken');
const {
  getWrapper,
  isSafeScormRelativePath,
  isWithinRoot,
} = require('../controllers/scorm.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
}

function mockReq(query, params = { contentId: 'content-1' }) {
  return {
    params,
    query,
    protocol: 'https',
    get: () => 'api.riseup.kids',
  };
}

const VALID_QUERY = {
  contentType: 'book',
  entryPoint: 'index.html',
  path: 'book/content-1/extracted',
  token: 'a-valid-looking-token',
};

describe('scorm.controller getWrapper — path-safety helpers (unit)', () => {
  const scormRoot = path.resolve(__dirname, '../uploads/scorm');

  it('isSafeScormRelativePath rejects traversal, absolute paths, drive letters, and NUL bytes', () => {
    expect(isSafeScormRelativePath('../../../.env')).toBe(false);
    expect(isSafeScormRelativePath('book/../../../.env')).toBe(false);
    expect(isSafeScormRelativePath('..\\..\\..\\.env')).toBe(false);
    expect(isSafeScormRelativePath('/etc/passwd')).toBe(false);
    expect(isSafeScormRelativePath('C:/Windows/System32')).toBe(false);
    expect(isSafeScormRelativePath('index.html\0.png')).toBe(false);
    expect(isSafeScormRelativePath('')).toBe(false);
    expect(isSafeScormRelativePath(undefined)).toBe(false);
  });

  it('isSafeScormRelativePath accepts normal SCORM-style relative paths', () => {
    expect(isSafeScormRelativePath('index.html')).toBe(true);
    expect(isSafeScormRelativePath('book/content-1/extracted')).toBe(true);
    expect(isSafeScormRelativePath('story.html')).toBe(true);
  });

  it('isWithinRoot only accepts paths that resolve inside the given root', () => {
    expect(isWithinRoot(path.join(scormRoot, 'book', 'x'), scormRoot)).toBe(true);
    expect(isWithinRoot(scormRoot, scormRoot)).toBe(true);
    expect(isWithinRoot(path.resolve(scormRoot, '../../.env'), scormRoot)).toBe(false);
    // sibling directory that merely shares the root as a string prefix (e.g. "scorm-evil")
    expect(isWithinRoot(scormRoot + '-evil', scormRoot)).toBe(false);
  });
});

describe('scorm.controller getWrapper — request handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401s when no token is supplied (was previously unauthenticated)', async () => {
    const req = mockReq({ ...VALID_QUERY, token: undefined });
    const res = mockRes();

    await getWrapper(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('401s when the token fails verification', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const req = mockReq(VALID_QUERY);
    const res = mockRes();

    await getWrapper(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('400s on an invalid contentType (after auth passes)', async () => {
    jwt.verify.mockReturnValue({ id: 'user-1' });
    const req = mockReq({ ...VALID_QUERY, contentType: 'not-a-real-type' });
    const res = mockRes();

    await getWrapper(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it.each([
    ['../../../../.env', 'entryPoint'],
    ['../../../server.js', 'entryPoint'],
    ['..\\..\\..\\.env', 'entryPoint'],
  ])('400s and never reads the file when entryPoint="%s" is a traversal attempt', async (evilEntryPoint) => {
    jwt.verify.mockReturnValue({ id: 'user-1' });
    const req = mockReq({ ...VALID_QUERY, entryPoint: evilEntryPoint });
    const res = mockRes();

    await getWrapper(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it.each([
    '../../../../.env',
    '../../..',
    '..\\..\\..\\..\\.env',
  ])('400s and never reads the file when path="%s" is a traversal attempt', async (evilPath) => {
    jwt.verify.mockReturnValue({ id: 'user-1' });
    const req = mockReq({ ...VALID_QUERY, path: evilPath });
    const res = mockRes();

    await getWrapper(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('reproduces the original disclosure attempt end to end: rejected, .env never touched', async () => {
    // This is the exact shape of the RUK-SEC-001 proof-of-concept from the audit:
    // GET /api/scorm/x/wrapper?contentType=book&entryPoint=.env&path=../../..
    jwt.verify.mockReturnValue({ id: 'attacker-controlled-but-valid-token' });
    const req = mockReq({
      contentType: 'book',
      entryPoint: '.env',
      path: '../../..',
      token: 'whatever',
    });
    const res = mockRes();

    await getWrapper(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(fs.pathExists).not.toHaveBeenCalled();
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('serves the wrapper normally for a legitimate, in-bounds request', async () => {
    jwt.verify.mockReturnValue({ id: 'user-1' });
    fs.pathExists.mockResolvedValue(true);
    fs.readFile.mockResolvedValue('<html><body>SCORM content</body></html>');
    const req = mockReq(VALID_QUERY);
    const res = mockRes();

    await getWrapper(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(fs.readFile).toHaveBeenCalledTimes(1);

    const readPath = fs.readFile.mock.calls[0][0];
    const scormRoot = path.resolve(__dirname, '../uploads/scorm');
    expect(isWithinRoot(readPath, scormRoot)).toBe(true);

    expect(res.send).toHaveBeenCalledTimes(1);
    const html = res.send.mock.calls[0][0];
    expect(html).toContain('SCORM content');
    expect(html).toContain('SCORM API SHIM');
  });
});
