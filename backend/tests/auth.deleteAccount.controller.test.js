jest.mock('../services/accountDeletion.service', () => ({
  requestParentAccountDeletion: jest.fn(),
}));

const accountDeletionService = require('../services/accountDeletion.service');
const { deleteAccount } = require('../controllers/auth.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('auth.controller deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits parent account deletion request', async () => {
    accountDeletionService.requestParentAccountDeletion.mockResolvedValue({
      accessRevoked: true,
      message: 'Your account access has been revoked.',
    });

    const req = {
      user: { _id: 'parent1', role: 'parent' },
      body: { password: 'secret123', confirmText: 'DELETE' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = mockRes();

    await deleteAccount(req, res);

    expect(accountDeletionService.requestParentAccountDeletion).toHaveBeenCalledWith('parent1', {
      password: 'secret123',
      confirmText: 'DELETE',
      requesterIp: '127.0.0.1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Your account access has been revoked.',
      data: expect.objectContaining({ accessRevoked: true }),
    });
  });

  it('returns 403 for non-parent users', async () => {
    const req = {
      user: { _id: 'admin1', role: 'admin' },
      body: { password: 'secret123', confirmText: 'DELETE' },
    };
    const res = mockRes();

    await deleteAccount(req, res);

    expect(accountDeletionService.requestParentAccountDeletion).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 when service throws validation error', async () => {
    accountDeletionService.requestParentAccountDeletion.mockRejectedValue(
      new Error('Password is incorrect')
    );

    const req = {
      user: { _id: 'parent1', role: 'parent' },
      body: { password: 'bad', confirmText: 'DELETE' },
      headers: {},
      socket: {},
    };
    const res = mockRes();

    await deleteAccount(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Password is incorrect',
    });
  });
});
