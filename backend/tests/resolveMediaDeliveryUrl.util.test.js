const {
  resolveMediaDeliveryUrl,
  resolveMediaDocumentUrl,
} = require('../utils/resolveMediaDeliveryUrl.util');

describe('resolveMediaDeliveryUrl.util', () => {
  afterEach(() => {
    delete process.env.AWS_S3_BASE_URL;
    delete process.env.BACKEND_BASE_URL;
  });

  it('returns absolute http(s) URLs unchanged', () => {
    expect(resolveMediaDeliveryUrl('https://cdn.example.com/a.jpg')).toBe(
      'https://cdn.example.com/a.jpg'
    );
  });

  it('joins relative upload paths to AWS_S3_BASE_URL', () => {
    process.env.AWS_S3_BASE_URL = 'https://cdn.example.com/';
    expect(resolveMediaDeliveryUrl('/uploads/media/images/cover.png')).toBe(
      'https://cdn.example.com/uploads/media/images/cover.png'
    );
  });

  it('resolveMediaDocumentUrl prefers cloudUrl', () => {
    expect(
      resolveMediaDocumentUrl({
        url: '/uploads/local.mp3',
        cloudUrl: 'https://cdn.example.com/remote.mp3',
      })
    ).toBe('https://cdn.example.com/remote.mp3');
  });
});
