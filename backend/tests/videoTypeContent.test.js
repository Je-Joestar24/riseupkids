jest.mock('../models', () => ({
  Media: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  Badge: {
    findById: jest.fn(),
  },
}));

jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
  deleteByKey: jest.fn().mockResolvedValue(undefined),
  getS3KeyFromUrl: jest.fn(),
}));

jest.mock('../services/scorm.service', () => ({
  uploadExtractedScormToS3: jest.fn().mockResolvedValue(null),
}));

const { Media, Badge } = require('../models');
const s3Service = require('../services/s3.service');

describe('video.services — content type video (upload vs Bunny embed)', () => {
  const userId = '507f1f77bcf86cd799439011';
  const validEmbed = 'https://iframe.mediadelivery.net/embed/video-guid-123';

  beforeEach(() => {
    jest.clearAllMocks();
    Badge.findById.mockResolvedValue({ _id: 'badge1', name: 'Star' });
  });

  function mockVideoDoc(overrides = {}) {
    return {
      _id: 'media1',
      save: jest.fn().mockResolvedValue(true),
      ...overrides,
    };
  }

  function mockFindByIdLean(result) {
    return {
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(result),
    };
  }

  it('createVideo rejects missing title', async () => {
    const { createVideo } = require('../services/video.services');
    await expect(createVideo(userId, { title: '  ' }, {})).rejects.toThrow(/Please provide a video title/);
  });

  it('createVideo rejects upload path without video file', async () => {
    const { createVideo } = require('../services/video.services');
    await expect(createVideo(userId, { title: 'Lesson' }, {})).rejects.toThrow(/Please provide a video file/);
  });

  it('createVideo rejects embed when a video file is attached', async () => {
    const { createVideo } = require('../services/video.services');
    await expect(
      createVideo(
        userId,
        { title: 'T', videoSource: 'embed', embedUrl: validEmbed },
        { videoFile: [{ originalname: 'x.mp4' }] }
      )
    ).rejects.toThrow(/Do not attach a video file/);
  });

  it('createVideo rejects embed when SCORM zip is attached', async () => {
    const { createVideo } = require('../services/video.services');
    await expect(
      createVideo(userId, { title: 'T', videoSource: 'embed', embedUrl: validEmbed }, { scormFile: [{}] })
    ).rejects.toThrow(/SCORM file is not supported/);
  });

  it('createVideo rejects invalid Bunny embed URL', async () => {
    const { createVideo } = require('../services/video.services');
    await expect(
      createVideo(userId, { title: 'T', videoSource: 'embed', embedUrl: 'http://evil.com/embed/x' }, {})
    ).rejects.toThrow(/HTTPS/);
  });

  it('createVideo creates embed Media without S3 video upload', async () => {
    Media.create.mockResolvedValue(mockVideoDoc());
    const leanResult = {
      _id: 'media1',
      type: 'video',
      videoSource: 'embed',
      embedUrl: validEmbed,
      url: validEmbed,
    };
    Media.findById.mockReturnValue(mockFindByIdLean(leanResult));

    const { createVideo } = require('../services/video.services');
    const out = await createVideo(
      userId,
      { title: ' Bunny lesson ', videoSource: 'embed', embedUrl: validEmbed },
      {}
    );

    expect(s3Service.uploadFileFromMulter).not.toHaveBeenCalled();
    expect(Media.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'video',
        videoSource: 'embed',
        embedUrl: validEmbed,
        cloudUrl: validEmbed,
      })
    );
    expect(out).toEqual(leanResult);
  });

  it('createVideo upload path uploads file to S3 and sets videoSource upload', async () => {
    s3Service.uploadFileFromMulter.mockResolvedValue({ url: 'https://cdn.example/v.mp4', s3Key: 'media/videos/v.mp4' });
    Media.create.mockResolvedValue(mockVideoDoc());
    Media.findById.mockReturnValue(
      mockFindByIdLean({ _id: 'media1', url: 'https://cdn.example/v.mp4', videoSource: 'upload' })
    );

    const fakeFile = {
      originalname: 'lesson.mp4',
      mimetype: 'video/mp4',
      size: 1024,
    };

    const { createVideo } = require('../services/video.services');
    await createVideo(userId, { title: 'Uploaded' }, { videoFile: [fakeFile] });

    expect(s3Service.uploadFileFromMulter).toHaveBeenCalledWith(fakeFile, 'media/videos');
    expect(Media.create).toHaveBeenCalledWith(
      expect.objectContaining({
        videoSource: 'upload',
        filePath: 'media/videos/v.mp4',
        mimeType: 'video/mp4',
        size: 1024,
      })
    );
  });

  it('updateVideo updates embedUrl for Bunny embed video', async () => {
    const newUrl = 'https://iframe.mediadelivery.net/embed/another-id';
    const videoDoc = {
      _id: 'media1',
      type: 'video',
      videoSource: 'embed',
      embedUrl: validEmbed,
      save: jest.fn().mockResolvedValue(true),
    };
    Media.findOne.mockResolvedValue(videoDoc);
    Media.findById.mockReturnValue(
      mockFindByIdLean({ _id: 'media1', videoSource: 'embed', embedUrl: newUrl, url: newUrl })
    );

    const { updateVideo } = require('../services/video.services');
    const out = await updateVideo('media1', userId, { embedUrl: newUrl }, {});

    expect(videoDoc.embedUrl).toBe(newUrl);
    expect(videoDoc.cloudUrl).toBe(newUrl);
    expect(videoDoc.url).toBe(newUrl);
    expect(videoDoc.save).toHaveBeenCalled();
    expect(out.embedUrl).toBe(newUrl);
  });

  it('updateVideo rejects embedUrl when video is uploaded file', async () => {
    const videoDoc = {
      _id: 'media1',
      type: 'video',
      videoSource: 'upload',
      save: jest.fn(),
    };
    Media.findOne.mockResolvedValue(videoDoc);

    const { updateVideo } = require('../services/video.services');
    await expect(updateVideo('media1', userId, { embedUrl: validEmbed }, {})).rejects.toThrow(
      /embedUrl can only be updated for Bunny embed videos/
    );
  });

  it('deleteVideo skips main file S3 delete for Bunny embed', async () => {
    const videoDoc = {
      _id: 'media1',
      type: 'video',
      videoSource: 'embed',
      scormFile: null,
      thumbnail: null,
    };
    Media.findOne.mockResolvedValue(videoDoc);
    Media.findByIdAndDelete.mockResolvedValue(true);

    const { deleteVideo } = require('../services/video.services');
    await deleteVideo('media1');

    expect(s3Service.deleteByKey).not.toHaveBeenCalled();
    expect(Media.findByIdAndDelete).toHaveBeenCalledWith('media1');
  });

  it('deleteVideo deletes S3 object for uploaded video main file', async () => {
    const videoDoc = {
      _id: 'media1',
      type: 'video',
      videoSource: 'upload',
      filePath: 'media/videos/x.mp4',
      scormFile: null,
      thumbnail: null,
    };
    Media.findOne.mockResolvedValue(videoDoc);
    Media.findByIdAndDelete.mockResolvedValue(true);

    const { deleteVideo } = require('../services/video.services');
    await deleteVideo('media1');

    expect(s3Service.deleteByKey).toHaveBeenCalledWith('media/videos/x.mp4');
  });
});
