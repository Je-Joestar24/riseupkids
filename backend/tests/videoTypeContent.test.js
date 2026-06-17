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
  CmsBook: {
    findOne: jest.fn(),
  },
}));

jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
  deleteByKey: jest.fn().mockResolvedValue(undefined),
  deleteByPrefix: jest.fn().mockResolvedValue(undefined),
  getS3KeyFromUrl: jest.fn(),
}));

jest.mock('../services/scorm.service', () => ({
  uploadExtractedScormToS3: jest.fn().mockResolvedValue(null),
}));

jest.mock('../services/html5handler.service', () => ({
  extractAndUploadToS3Only: jest.fn(),
}));

jest.mock('../utils/starCamMissionMedia.util', () => ({
  getStarCamMissionVideoMediaIds: jest.fn().mockResolvedValue([]),
}));

const { Media, Badge, CmsBook } = require('../models');
const s3Service = require('../services/s3.service');
const scormService = require('../services/scorm.service');
const html5handlerService = require('../services/html5handler.service');
const { getStarCamMissionVideoMediaIds } = require('../utils/starCamMissionMedia.util');

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

  it('createVideo handles uploaded video with optional SCORM package and cover image together', async () => {
    const videoDoc = mockVideoDoc({ _id: 'video-media' });
    const scormDoc = { _id: 'scorm-media' };
    const createdLean = {
      _id: 'video-media',
      type: 'video',
      videoSource: 'upload',
      filePath: 'media/videos/lesson.mp4',
      url: 'https://cdn.example/videos/lesson.mp4',
      scormFile: { _id: 'scorm-media', title: 'lesson-scorm.zip' },
      scormFilePath: 'activities/scorm/lesson-scorm.zip',
      scormFileUrl: 'https://cdn.example/scorm/lesson-scorm.zip',
      scormBaseUrl: 'https://cdn.example/scorm/video/video-media',
      scormEntryPoint: 'story.html',
      thumbnail: 'https://cdn.example/images/cover.png',
      tags: ['movement', 'lesson'],
    };

    const videoFile = {
      originalname: 'lesson.mp4',
      mimetype: 'video/mp4',
      size: 2048,
    };
    const scormFile = {
      originalname: 'lesson-scorm.zip',
      mimetype: 'application/zip',
      size: 4096,
      buffer: Buffer.from('fake-scorm-zip'),
    };
    const coverImage = {
      originalname: 'cover.png',
      mimetype: 'image/png',
      size: 512,
    };

    s3Service.uploadFileFromMulter.mockImplementation(async (file, folder) => {
      const uploads = {
        'media/videos': { url: 'https://cdn.example/videos/lesson.mp4', s3Key: 'media/videos/lesson.mp4' },
        'activities/scorm': {
          url: 'https://cdn.example/scorm/lesson-scorm.zip',
          s3Key: 'activities/scorm/lesson-scorm.zip',
        },
        'media/images': { url: 'https://cdn.example/images/cover.png', s3Key: 'media/images/cover.png' },
      };
      return uploads[folder];
    });
    Media.create.mockResolvedValueOnce(videoDoc).mockResolvedValueOnce(scormDoc);
    scormService.uploadExtractedScormToS3.mockResolvedValue({
      baseUrl: 'https://cdn.example/scorm/video/video-media',
      entryPoint: 'story.html',
    });
    Media.findById.mockReturnValue(mockFindByIdLean(createdLean));

    const { createVideo } = require('../services/video.services');
    const out = await createVideo(
      userId,
      {
        title: ' Uploaded Lesson ',
        description: ' A full upload path ',
        tags: JSON.stringify(['movement', ' ', 'lesson']),
        isPublished: 'true',
        starsAwarded: '25',
        requiredWatchCount: '3',
      },
      { videoFile: [videoFile], scormFile: [scormFile], coverImage: [coverImage] }
    );

    expect(s3Service.uploadFileFromMulter).toHaveBeenNthCalledWith(1, videoFile, 'media/videos');
    expect(s3Service.uploadFileFromMulter).toHaveBeenNthCalledWith(2, scormFile, 'activities/scorm');
    expect(s3Service.uploadFileFromMulter).toHaveBeenNthCalledWith(3, coverImage, 'media/images');
    expect(Media.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'video',
        videoSource: 'upload',
        title: 'Uploaded Lesson',
        description: 'A full upload path',
        filePath: 'media/videos/lesson.mp4',
        url: 'https://cdn.example/videos/lesson.mp4',
        starsAwarded: 25,
        requiredWatchCount: 3,
        isPublished: true,
      })
    );
    expect(Media.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'video',
        title: 'lesson-scorm.zip',
        filePath: 'activities/scorm/lesson-scorm.zip',
        url: 'https://cdn.example/scorm/lesson-scorm.zip',
        mimeType: 'application/zip',
        size: 4096,
      })
    );
    expect(scormService.uploadExtractedScormToS3).toHaveBeenCalledWith(
      scormFile.buffer,
      'video',
      'video-media'
    );
    expect(videoDoc.scormFile).toBe('scorm-media');
    expect(videoDoc.scormFilePath).toBe('activities/scorm/lesson-scorm.zip');
    expect(videoDoc.scormFileUrl).toBe('https://cdn.example/scorm/lesson-scorm.zip');
    expect(videoDoc.scormFileSize).toBe(4096);
    expect(videoDoc.scormBaseUrl).toBe('https://cdn.example/scorm/video/video-media');
    expect(videoDoc.scormEntryPoint).toBe('story.html');
    expect(videoDoc.thumbnail).toBe('https://cdn.example/images/cover.png');
    expect(videoDoc.tags).toEqual(['movement', 'lesson']);
    expect(videoDoc.save).toHaveBeenCalledTimes(4);
    expect(out).toEqual(createdLean);
  });

  it('createVideo creates uploaded video with HTML5 follow-up package', async () => {
    const videoDoc = mockVideoDoc({ _id: 'video-media' });
    const videoFile = { originalname: 'lesson.mp4', mimetype: 'video/mp4', size: 2048 };
    const html5File = {
      originalname: 'lesson-html5.zip',
      mimetype: 'application/zip',
      size: 4096,
      buffer: Buffer.from('html5-package'),
    };
    s3Service.uploadFileFromMulter.mockResolvedValue({
      url: 'https://cdn.example/videos/lesson.mp4',
      s3Key: 'media/videos/lesson.mp4',
    });
    Media.create.mockResolvedValue(videoDoc);
    html5handlerService.extractAndUploadToS3Only.mockResolvedValue({
      id: 'html5-video-pkg',
      entryPoint: 'story.html',
      baseUrl: 'https://cdn.example/html5/html5-video-pkg',
    });
    Media.findById.mockReturnValue(
      mockFindByIdLean({ _id: 'video-media', completionContentType: 'html5', html5PackageId: 'html5-video-pkg' })
    );

    const { createVideo } = require('../services/video.services');
    await createVideo(
      userId,
      { title: 'Video with HTML5', completionContentType: 'html5' },
      { videoFile: [videoFile], html5File: [html5File] }
    );

    expect(html5handlerService.extractAndUploadToS3Only).toHaveBeenCalledWith(html5File.buffer);
    expect(videoDoc.completionContentType).toBe('html5');
    expect(videoDoc.html5PackageId).toBe('html5-video-pkg');
    expect(videoDoc.html5EntryPoint).toBe('story.html');
    expect(videoDoc.html5BaseUrl).toBe('https://cdn.example/html5/html5-video-pkg');
  });

  it('createVideo creates embedded video with built-in CMS book follow-up', async () => {
    CmsBook.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011' }),
      }),
    });
    Media.create.mockResolvedValue(mockVideoDoc());
    Media.findById.mockReturnValue(
      mockFindByIdLean({ _id: 'video-media', completionContentType: 'builtin', cmsBookId: '507f1f77bcf86cd799439011' })
    );

    const { createVideo } = require('../services/video.services');
    await createVideo(
      userId,
      {
        title: 'Embed with CMS',
        videoSource: 'embed',
        embedUrl: validEmbed,
        completionContentType: 'builtin',
        cmsBookId: '507f1f77bcf86cd799439011',
      },
      {}
    );

    expect(CmsBook.findOne).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439011',
      status: 'published',
      isArchived: false,
    });
    expect(Media.create).toHaveBeenCalledWith(
      expect.objectContaining({
        videoSource: 'embed',
        completionContentType: 'builtin',
        cmsBookId: '507f1f77bcf86cd799439011',
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

  it('updateVideo switches follow-up to built-in CMS book', async () => {
    const videoDoc = {
      _id: 'media1',
      type: 'video',
      videoSource: 'upload',
      completionContentType: 'none',
      save: jest.fn().mockResolvedValue(true),
    };
    CmsBook.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011' }),
      }),
    });
    Media.findOne.mockResolvedValue(videoDoc);
    Media.findById.mockReturnValue(
      mockFindByIdLean({ _id: 'media1', completionContentType: 'builtin', cmsBookId: '507f1f77bcf86cd799439011' })
    );

    const { updateVideo } = require('../services/video.services');
    await updateVideo(
      'media1',
      userId,
      { completionContentType: 'builtin', cmsBookId: '507f1f77bcf86cd799439011' },
      {}
    );

    expect(videoDoc.completionContentType).toBe('builtin');
    expect(videoDoc.cmsBookId).toBe('507f1f77bcf86cd799439011');
    expect(videoDoc.html5PackageId).toBeNull();
    expect(videoDoc.save).toHaveBeenCalled();
  });

  it('updateVideo replaces HTML5 follow-up package', async () => {
    const videoDoc = {
      _id: 'media1',
      type: 'video',
      videoSource: 'upload',
      completionContentType: 'html5',
      html5PackageId: 'old-package',
      save: jest.fn().mockResolvedValue(true),
    };
    const html5File = {
      originalname: 'replacement.zip',
      mimetype: 'application/zip',
      buffer: Buffer.from('replacement-html5'),
      size: 1024,
    };
    Media.findOne.mockResolvedValue(videoDoc);
    html5handlerService.extractAndUploadToS3Only.mockResolvedValue({
      id: 'new-package',
      entryPoint: 'index.html',
      baseUrl: 'https://cdn.example/html5/new-package',
    });
    Media.findById.mockReturnValue(
      mockFindByIdLean({ _id: 'media1', completionContentType: 'html5', html5PackageId: 'new-package' })
    );

    const { updateVideo } = require('../services/video.services');
    await updateVideo(
      'media1',
      userId,
      { completionContentType: 'html5' },
      { html5File: [html5File] }
    );

    expect(s3Service.deleteByPrefix).toHaveBeenCalledWith('html5/old-package');
    expect(html5handlerService.extractAndUploadToS3Only).toHaveBeenCalledWith(html5File.buffer);
    expect(videoDoc.completionContentType).toBe('html5');
    expect(videoDoc.html5PackageId).toBe('new-package');
    expect(videoDoc.save).toHaveBeenCalled();
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

  it('getAllVideos excludes Star Cam mission video media from the content list', async () => {
    getStarCamMissionVideoMediaIds.mockResolvedValue(['mission-video-1', 'mission-video-2']);

    const findChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'course-video-1', title: 'Course Video' }]),
    };
    Media.find.mockReturnValue(findChain);
    Media.countDocuments.mockResolvedValue(1);

    const { getAllVideos } = require('../services/video.services');
    const result = await getAllVideos({ page: 1, limit: 10 });

    expect(Media.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'video',
        isActive: true,
        _id: { $nin: ['mission-video-1', 'mission-video-2'] },
      })
    );
    expect(Media.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $nin: ['mission-video-1', 'mission-video-2'] },
      })
    );
    expect(result.videos).toHaveLength(1);
    expect(result.videos[0]._id).toBe('course-video-1');
  });
});
