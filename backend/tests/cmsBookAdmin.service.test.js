jest.mock('../models', () => ({
  CmsBook: {
    create: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  Media: {
    find: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('../services/s3.service', () => ({
  deleteByKey: jest.fn(),
  getS3KeyFromUrl: jest.fn((value) => value),
  uploadFileFromMulter: jest.fn(),
}));
jest.mock('../utils/audioSilenceTrim.util', () => ({
  trimLeadingTrailingSilence: jest.fn(),
}));

const { CmsBook, Media } = require('../models');
const s3Service = require('../services/s3.service');
const { trimLeadingTrailingSilence } = require('../utils/audioSilenceTrim.util');
const service = require('../services/cmsBookAdmin.service');

function makeDoc(overrides = {}) {
  return {
    _id: 'book-1',
    status: 'draft',
    isArchived: false,
    title: 'Sample',
    pages: [],
    updatedBy: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('cmsBookAdmin.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates cms book with createdBy and updatedBy', async () => {
    CmsBook.create.mockResolvedValue({ _id: 'book-1', title: 'My Book' });

    const result = await service.createCmsBook({
      userId: 'admin-1',
      payload: { title: 'My Book', language: 'en', pages: [] },
    });

    expect(result).toMatchObject({ _id: 'book-1' });
    expect(CmsBook.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Book',
        createdBy: 'admin-1',
        updatedBy: 'admin-1',
      })
    );
  });

  it('lists cms books with pagination', async () => {
    CmsBook.countDocuments.mockResolvedValue(2);
    CmsBook.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'book-1' }, { _id: 'book-2' }]),
    });

    const result = await service.listCmsBooks({ page: 1, limit: 10, search: 'animals' });
    expect(result.pagination.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(CmsBook.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        isArchived: false,
        $or: expect.any(Array),
      })
    );
  });

  it('lists cms books with resolved cover page image media', async () => {
    CmsBook.countDocuments.mockResolvedValue(1);
    CmsBook.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'book-1',
          title: 'Cover Book',
          pages: [
            {
              pageId: 'cover-1',
              order: 1,
              type: 'cover',
              media: { imageMediaId: 'media-cover-1' },
            },
            {
              pageId: 'content-1',
              order: 2,
              type: 'content',
              media: { imageMediaId: 'media-content-1' },
            },
          ],
        },
      ]),
    });
    Media.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'media-cover-1',
          type: 'image',
          url: '/uploads/media/images/cover.png',
          cloudUrl: null,
          mimeType: 'image/png',
        },
      ]),
    });

    const result = await service.listCmsBooks({ page: 1, limit: 10 });

    expect(Media.find).toHaveBeenCalledWith({
      _id: { $in: ['media-cover-1'] },
      isActive: true,
    });
    expect(result.items[0].coverImageMediaId).toBe('media-cover-1');
    expect(result.items[0].coverImageUrl).toBe('/uploads/media/images/cover.png');
    expect(result.items[0].pages[0].media.imageMedia).toMatchObject({
      id: 'media-cover-1',
      type: 'image',
      url: '/uploads/media/images/cover.png',
      mimeType: 'image/png',
    });
    expect(result.items[0].pages[1].media.imageMedia).toBeUndefined();
  });

  it('updates draft cms book', async () => {
    const doc = makeDoc({ title: 'Old' });
    CmsBook.findById.mockResolvedValue(doc);

    const result = await service.updateCmsBook({
      bookId: 'book-1',
      userId: 'admin-1',
      patch: { title: 'New Title' },
    });

    expect(result.title).toBe('New Title');
    expect(result.updatedBy).toBe('admin-1');
    expect(doc.save).toHaveBeenCalled();
  });

  it('updates published cms book', async () => {
    const doc = makeDoc({ status: 'published', title: 'Old Published' });
    CmsBook.findById.mockResolvedValue(doc);

    const result = await service.updateCmsBook({
      bookId: 'book-1',
      userId: 'admin-1',
      patch: { title: 'Updated Published' },
    });

    expect(result.title).toBe('Updated Published');
    expect(result.updatedBy).toBe('admin-1');
    expect(doc.save).toHaveBeenCalled();
  });

  it('auto-generates reading words for content page when text and durationSec are provided', async () => {
    const doc = makeDoc({
      pages: [
        {
          pageId: 'p-1',
          order: 1,
          type: 'content',
          reading: { text: 'I am a starfish', durationSec: 4.2 },
        },
      ],
    });
    CmsBook.findById.mockResolvedValue(doc);

    const result = await service.updateCmsBook({
      bookId: 'book-1',
      userId: 'admin-1',
      patch: {
        pages: [
          {
            pageId: 'p-1',
            order: 1,
            type: 'content',
            reading: { text: 'I am a starfish', durationSec: 4.2 },
          },
        ],
      },
    });

    expect(result.pages[0].reading.words).toHaveLength(4);
    expect(result.pages[0].reading.words[0]).toMatchObject({
      w: 'I',
      start: 0,
    });
    expect(result.pages[0].reading.words[result.pages[0].reading.words.length - 1].end).toBe(4.2);
  });

  it('throws validation error when reading.words is set without durationSec', async () => {
    const doc = makeDoc();
    CmsBook.findById.mockResolvedValue(doc);

    await expect(
      service.updateCmsBook({
        bookId: 'book-1',
        userId: 'admin-1',
        patch: {
          pages: [
            {
              pageId: 'p-1',
              order: 1,
              type: 'content',
              reading: {
                text: 'hello world',
                words: [
                  { w: 'hello', start: 0, end: 1 },
                  { w: 'world', start: 1, end: 2 },
                ],
              },
            },
          ],
        },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('publishes book', async () => {
    const doc = makeDoc({ status: 'draft' });
    CmsBook.findById.mockResolvedValue(doc);

    const result = await service.publishCmsBook({ bookId: 'book-1', userId: 'admin-1' });
    expect(result.status).toBe('published');
    expect(doc.save).toHaveBeenCalled();
  });

  it('archives book', async () => {
    const doc = makeDoc();
    CmsBook.findById.mockResolvedValue(doc);

    const result = await service.archiveCmsBook({ bookId: 'book-1', userId: 'admin-1' });
    expect(result).toMatchObject({ id: 'book-1' });
    expect(doc.status).toBe('archived');
    expect(doc.isArchived).toBe(true);
    expect(doc.save).toHaveBeenCalled();
  });

  it('deletes book and cleans up attached media', async () => {
    CmsBook.findById.mockResolvedValue({
      _id: 'book-1',
      pages: [
        {
          media: {
            imageMediaId: 'm-1',
            guideImageMediaIds: ['m-2'],
          },
          interaction: {
            options: [
              { imageMediaId: 'm-3', audioMediaId: 'm-4' },
            ],
          },
        },
      ],
    });
    Media.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'm-1', filePath: 'media/images/1.png' },
        { _id: 'm-2', filePath: 'media/images/2.png' },
        { _id: 'm-3', filePath: 'media/images/3.png' },
        { _id: 'm-4', filePath: 'media/audio/4.mp3' },
      ]),
    });
    Media.deleteMany.mockResolvedValue({ deletedCount: 4 });
    CmsBook.findByIdAndDelete.mockResolvedValue({ _id: 'book-1' });
    s3Service.deleteByKey.mockResolvedValue(true);

    const result = await service.deleteCmsBook({ bookId: 'book-1', userId: 'admin-1' });

    expect(result).toMatchObject({ id: 'book-1', deletedMediaCount: 4 });
    expect(s3Service.deleteByKey).toHaveBeenCalledTimes(4);
    expect(Media.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['m-1', 'm-2', 'm-3', 'm-4'] } });
    expect(CmsBook.findByIdAndDelete).toHaveBeenCalledWith('book-1');
  });

  it('uploads trimmed audio with duration and trimMeta', async () => {
    const trimmedBuffer = Buffer.from('trimmed-audio');
    trimLeadingTrailingSilence.mockResolvedValue({
      buffer: trimmedBuffer,
      mimetype: 'audio/mpeg',
      size: trimmedBuffer.length,
      durationSec: 4.2,
      trimMeta: {
        applied: true,
        originalDurationSec: 6,
        trimmedDurationSec: 4.2,
        trimmedStartSec: 1.5,
        trimmedEndSec: 0.3,
      },
    });
    s3Service.uploadFileFromMulter.mockResolvedValue({
      url: 'https://cdn.example.com/audio/trimmed.mp3',
      s3Key: 'media/audio/trimmed.mp3',
    });
    Media.create.mockResolvedValue({
      _id: 'media-audio-1',
      type: 'audio',
      duration: 4.2,
      toObject() {
        return {
          _id: 'media-audio-1',
          type: 'audio',
          duration: 4.2,
        };
      },
    });

    const inputFile = {
      buffer: Buffer.from('raw-audio'),
      mimetype: 'audio/mpeg',
      originalname: 'narration.mp3',
      size: 12,
    };

    const result = await service.uploadCmsBookMedia({
      userId: 'admin-1',
      file: inputFile,
      mediaType: 'audio',
      title: 'Narration',
    });

    expect(trimLeadingTrailingSilence).toHaveBeenCalledWith(inputFile);
    expect(s3Service.uploadFileFromMulter).toHaveBeenCalledWith(
      expect.objectContaining({
        buffer: trimmedBuffer,
        mimetype: 'audio/mpeg',
        size: trimmedBuffer.length,
      }),
      'media/audio'
    );
    expect(Media.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'audio',
        duration: 4.2,
      })
    );
    expect(result).toMatchObject({
      _id: 'media-audio-1',
      duration: 4.2,
      trimMeta: expect.objectContaining({ applied: true }),
    });
  });
});
