jest.mock('../services/cmsBookPlayer.service', () => ({
  listPlayableCmsBooksForParent: jest.fn(),
  getPlayableCmsBookForParent: jest.fn(),
}));

const service = require('../services/cmsBookPlayer.service');
const controller = require('../controllers/cmsBookPlayer.controller');

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('cmsBookPlayer.controller', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lists playable books for parent', async () => {
    service.listPlayableCmsBooksForParent.mockResolvedValue({ items: [] });
    const req = { user: { role: 'parent' }, query: {} };
    const res = makeRes();

    await controller.listPlayableBooks(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(service.listPlayableCmsBooksForParent).toHaveBeenCalledWith(
      expect.objectContaining({ userRole: 'parent' })
    );
  });

  it('gets one playable book for parent', async () => {
    service.getPlayableCmsBookForParent.mockResolvedValue({ id: 'book-1', pages: [] });
    const req = { user: { role: 'parent' }, params: { id: 'book-1' } };
    const res = makeRes();

    await controller.getPlayableBookById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(service.getPlayableCmsBookForParent).toHaveBeenCalledWith({
      userRole: 'parent',
      bookId: 'book-1',
    });
  });

  it('returns error statusCode from service', async () => {
    const err = new Error('forbidden');
    err.statusCode = 403;
    service.listPlayableCmsBooksForParent.mockRejectedValue(err);
    const req = { user: { role: 'teacher' }, query: {} };
    const res = makeRes();

    await controller.listPlayableBooks(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
