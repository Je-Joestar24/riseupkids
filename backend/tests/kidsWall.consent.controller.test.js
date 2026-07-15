jest.mock('../services/kidsWall.service', () => ({
  createPostWithImage: jest.fn(),
}));

jest.mock('../services/kidsWallConsent.service', () => ({
  assertKidsWallEnabled: jest.fn(),
}));

jest.mock('../models', () => ({
  ChildProfile: {
    findOne: jest.fn(),
  },
}));

const kidsWallService = require('../services/kidsWall.service');
const kidsWallConsentService = require('../services/kidsWallConsent.service');
const { ChildProfile } = require('../models');
const { createPost } = require('../controllers/kidsWall.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('kidsWall.controller createPost consent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks post when Kids Wall consent is missing', async () => {
    ChildProfile.findOne.mockResolvedValue({ _id: 'child1', parent: 'parent1' });
    kidsWallConsentService.assertKidsWallEnabled.mockRejectedValue(
      new Error('Kids Wall is not enabled for this child. A parent must enable it in account settings.')
    );

    const req = {
      params: { childId: 'child1' },
      user: { _id: 'parent1', role: 'parent' },
      body: { title: 'Hi', content: 'Hello' },
      file: { originalname: 'pic.jpg' },
    };
    const res = mockRes();

    await createPost(req, res);

    expect(kidsWallService.createPostWithImage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('creates post when consent is enabled', async () => {
    ChildProfile.findOne.mockResolvedValue({ _id: 'child1', parent: 'parent1' });
    kidsWallConsentService.assertKidsWallEnabled.mockResolvedValue({
      kidsWallEnabled: true,
    });
    kidsWallService.createPostWithImage.mockResolvedValue({ _id: 'post1', title: 'Hi' });

    const req = {
      params: { childId: 'child1' },
      user: { _id: 'parent1', role: 'parent' },
      body: { title: 'Hi', content: 'Hello' },
      file: { originalname: 'pic.jpg' },
    };
    const res = mockRes();

    await createPost(req, res);

    expect(kidsWallService.createPostWithImage).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('skips consent check for admin', async () => {
    kidsWallService.createPostWithImage.mockResolvedValue({ _id: 'post1' });

    const req = {
      params: { childId: 'child1' },
      user: { _id: 'admin1', role: 'admin' },
      body: { title: 'Hi', content: 'Hello' },
      file: { originalname: 'pic.jpg' },
    };
    const res = mockRes();

    await createPost(req, res);

    expect(kidsWallConsentService.assertKidsWallEnabled).not.toHaveBeenCalled();
    expect(kidsWallService.createPostWithImage).toHaveBeenCalled();
  });
});
