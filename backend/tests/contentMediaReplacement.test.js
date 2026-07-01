jest.mock('../models', () => ({
  Media: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  Badge: { findById: jest.fn() },
  CmsBook: { findOne: jest.fn() },
  Book: { findById: jest.fn() },
  Activity: { findById: jest.fn() },
  Chant: { findById: jest.fn() },
  AudioAssignment: { findById: jest.fn() },
  ExploreContent: { findById: jest.fn() },
}));

jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
  deleteByKey: jest.fn().mockResolvedValue(undefined),
  deleteByPrefix: jest.fn().mockResolvedValue(undefined),
  getS3KeyFromUrl: jest.fn(),
}));

jest.mock('../services/scorm.service', () => ({
  uploadExtractedScormToS3: jest.fn().mockResolvedValue({
    baseUrl: 'https://cdn.example/scorm/extracted',
    entryPoint: 'index.html',
  }),
}));

jest.mock('../services/html5handler.service', () => ({
  extractAndUploadToS3Only: jest.fn(),
}));

jest.mock('../utils/instructionVideoMedia.util', () => ({
  INSTRUCTION_VIDEO_POPULATE_SELECT: 'type title url videoSource embedUrl',
  resolveInstructionVideoMedia: jest.fn().mockResolvedValue(null),
  deleteInstructionVideoMedia: jest.fn(),
}));

const {
  Media,
  Activity,
  Book,
  Chant,
  AudioAssignment,
  ExploreContent,
} = require('../models');
const s3Service = require('../services/s3.service');
const scormService = require('../services/scorm.service');
const html5handlerService = require('../services/html5handler.service');

describe('content media replacement on update', () => {
  const userId = '507f1f77bcf86cd799439011';
  const validEmbed = 'https://iframe.mediadelivery.net/embed/video-guid-123';

  beforeEach(() => {
    jest.clearAllMocks();
    s3Service.uploadFileFromMulter.mockResolvedValue({
      url: 'https://cdn.example/new-file',
      s3Key: 'media/new-file',
    });
  });

  function mockSaveDoc(overrides = {}) {
    return {
      _id: 'doc1',
      save: jest.fn().mockResolvedValue(true),
      ...overrides,
    };
  }

  function mockFindByIdPopulateLean(result) {
    return {
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(result),
    };
  }

  it('updateActivity replaces SCORM package and deletes old assets', async () => {
    const activity = mockSaveDoc({
      scormFile: 'old-scorm-id',
      scormFilePath: 'activities/scorm/old.zip',
    });
    Activity.findById.mockResolvedValue(activity);
    Media.findById.mockResolvedValue({ _id: 'old-scorm-id', filePath: 'activities/scorm/old.zip' });
    Media.create.mockResolvedValue({ _id: 'new-scorm-id' });
    Activity.findById.mockReturnValueOnce(activity);
    Activity.findById.mockReturnValue(mockFindByIdPopulateLean({ _id: 'doc1', scormFile: { _id: 'new-scorm-id' } }));

    const scormFile = {
      originalname: 'activity.zip',
      mimetype: 'application/zip',
      size: 2048,
      buffer: Buffer.from('zip'),
    };

    const { updateActivity } = require('../services/activity.services');
    await updateActivity('doc1', userId, {}, { scormFile: [scormFile] });

    expect(s3Service.deleteByKey).toHaveBeenCalledWith('activities/scorm/old.zip');
    expect(s3Service.deleteByPrefix).toHaveBeenCalledWith('scorm/activity/doc1');
    expect(Media.findByIdAndDelete).toHaveBeenCalledWith('old-scorm-id');
    expect(scormService.uploadExtractedScormToS3).toHaveBeenCalledWith(scormFile.buffer, 'activity', 'doc1');
    expect(activity.scormFile).toBe('new-scorm-id');
    expect(activity.save).toHaveBeenCalled();
  });

  it('updateBook replaces HTML5 package for html5 books', async () => {
    const book = mockSaveDoc({
      packageType: 'html5',
      html5PackageId: 'old-html5',
    });
    Book.findById.mockResolvedValue(book);
    html5handlerService.extractAndUploadToS3Only.mockResolvedValue({
      id: 'new-html5',
      entryPoint: 'story.html',
      baseUrl: 'https://cdn.example/html5/new-html5',
    });
    Book.findById.mockReturnValueOnce(book);
    Book.findById.mockReturnValue(mockFindByIdPopulateLean({ _id: 'doc1', html5PackageId: 'new-html5' }));

    const zipFile = {
      originalname: 'book.zip',
      mimetype: 'application/zip',
      size: 1024,
      buffer: Buffer.from('zip'),
    };

    const { updateBook } = require('../services/book.services');
    await updateBook('doc1', userId, {}, { scormFile: [zipFile] });

    expect(s3Service.deleteByPrefix).toHaveBeenCalledWith('html5/old-html5');
    expect(book.html5PackageId).toBe('new-html5');
    expect(book.save).toHaveBeenCalled();
  });

  it('updateChant replaces chant audio', async () => {
    const chant = mockSaveDoc({ audio: 'old-audio-id' });
    Chant.findById.mockResolvedValue(chant);
    Media.findById.mockResolvedValue({ _id: 'old-audio-id', filePath: 'media/audio/old.mp3' });
    Media.create.mockResolvedValue({ _id: 'new-audio-id' });
    Chant.findById.mockReturnValueOnce(chant);
    Chant.findById.mockReturnValue(mockFindByIdPopulateLean({ _id: 'doc1', audio: { _id: 'new-audio-id' } }));

    const audioFile = {
      originalname: 'chant.mp3',
      mimetype: 'audio/mpeg',
      size: 512,
    };

    const { updateChant } = require('../services/chant.services');
    await updateChant('doc1', userId, {}, { audio: [audioFile] });

    expect(s3Service.deleteByKey).toHaveBeenCalledWith('media/audio/old.mp3');
    expect(Media.findByIdAndDelete).toHaveBeenCalledWith('old-audio-id');
    expect(chant.audio).toBe('new-audio-id');
    expect(chant.save).toHaveBeenCalled();
  });

  it('updateAudioAssignment replaces reference audio', async () => {
    const assignment = mockSaveDoc({ referenceAudio: 'old-ref-id' });
    AudioAssignment.findById.mockResolvedValue(assignment);
    Media.findById.mockResolvedValue({ _id: 'old-ref-id', filePath: 'media/audio/ref.mp3' });
    Media.create.mockResolvedValue({ _id: 'new-ref-id' });
    AudioAssignment.findById.mockReturnValueOnce(assignment);
    AudioAssignment.findById.mockReturnValue(
      mockFindByIdPopulateLean({ _id: 'doc1', referenceAudio: { _id: 'new-ref-id' } })
    );

    const referenceAudio = {
      originalname: 'reference.mp3',
      mimetype: 'audio/mpeg',
      size: 512,
    };

    const { updateAudioAssignment } = require('../services/audioAssignment.services');
    await updateAudioAssignment('doc1', userId, {}, { referenceAudio: [referenceAudio] });

    expect(s3Service.deleteByKey).toHaveBeenCalledWith('media/audio/ref.mp3');
    expect(assignment.referenceAudio).toBe('new-ref-id');
    expect(assignment.save).toHaveBeenCalled();
  });

  it('updateVideo replaces uploaded main video file', async () => {
    const videoDoc = mockSaveDoc({
      type: 'video',
      tags: ['course-video'],
      videoSource: 'upload',
      filePath: 'media/videos/old.mp4',
    });
    Media.findOne.mockResolvedValue(videoDoc);
    Media.findById.mockReturnValue(
      mockFindByIdPopulateLean({ _id: 'media1', videoSource: 'upload', url: 'https://cdn.example/new-file' })
    );

    const videoFile = {
      originalname: 'replacement.mp4',
      mimetype: 'video/mp4',
      size: 4096,
    };

    const { updateVideo } = require('../services/video.services');
    await updateVideo('media1', userId, {}, { videoFile: [videoFile] });

    expect(s3Service.deleteByKey).toHaveBeenCalledWith('media/videos/old.mp4');
    expect(videoDoc.filePath).toBe('media/new-file');
    expect(videoDoc.url).toBe('https://cdn.example/new-file');
    expect(videoDoc.videoSource).toBe('upload');
    expect(videoDoc.save).toHaveBeenCalled();
  });

  it('updateVideo switches from upload to Bunny embed', async () => {
    const newUrl = 'https://iframe.mediadelivery.net/embed/new-guid';
    const videoDoc = mockSaveDoc({
      type: 'video',
      tags: ['course-video'],
      videoSource: 'upload',
      filePath: 'media/videos/old.mp4',
    });
    Media.findOne.mockResolvedValue(videoDoc);
    Media.findById.mockReturnValue(
      mockFindByIdPopulateLean({ _id: 'media1', videoSource: 'embed', embedUrl: newUrl })
    );

    const { updateVideo } = require('../services/video.services');
    await updateVideo('media1', userId, { videoSource: 'embed', embedUrl: newUrl }, {});

    expect(s3Service.deleteByKey).toHaveBeenCalledWith('media/videos/old.mp4');
    expect(videoDoc.videoSource).toBe('embed');
    expect(videoDoc.embedUrl).toBe(newUrl);
    expect(videoDoc.filePath).toBeNull();
    expect(videoDoc.save).toHaveBeenCalled();
  });

  it('updateExploreContent replaces uploaded explore video file', async () => {
    const content = mockSaveDoc({
      type: 'video',
      title: 'Explore clip',
      videoFile: 'media-id',
      videoFilePath: 'media/videos/old-explore.mp4',
      videoFileUrl: 'https://cdn.example/old-explore.mp4',
    });
    const mediaRecord = mockSaveDoc({
      videoSource: 'upload',
      filePath: 'media/videos/old-explore.mp4',
    });
    ExploreContent.findById.mockResolvedValue(content);
    Media.findById.mockResolvedValue(mediaRecord);
    ExploreContent.findById.mockReturnValueOnce(content);
    ExploreContent.findById.mockReturnValue(
      mockFindByIdPopulateLean({ _id: 'explore1', videoFileUrl: 'https://cdn.example/new-file' })
    );

    const videoFile = {
      originalname: 'explore.mp4',
      mimetype: 'video/mp4',
      size: 8192,
      path: '/tmp/explore.mp4',
    };

    const { updateExploreContent } = require('../services/explore.services');
    await updateExploreContent('explore1', userId, {}, { videoFile: [videoFile] });

    expect(s3Service.deleteByKey).toHaveBeenCalledWith('media/videos/old-explore.mp4');
    expect(content.videoFilePath).toBe('media/new-file');
    expect(content.videoFileUrl).toBe('https://cdn.example/new-file');
    expect(mediaRecord.filePath).toBe('media/new-file');
    expect(content.save).toHaveBeenCalled();
  });

  it('updateExploreContent updates Bunny embed URL', async () => {
    const newUrl = 'https://iframe.mediadelivery.net/embed/explore-new';
    const content = mockSaveDoc({
      type: 'video',
      videoFile: 'media-id',
      videoFileUrl: validEmbed,
    });
    const mediaRecord = mockSaveDoc({
      videoSource: 'embed',
      embedUrl: validEmbed,
    });
    ExploreContent.findById.mockResolvedValue(content);
    Media.findById.mockResolvedValue(mediaRecord);
    ExploreContent.findById.mockReturnValueOnce(content);
    ExploreContent.findById.mockReturnValue(
      mockFindByIdPopulateLean({ _id: 'explore1', videoFileUrl: newUrl })
    );

    const { updateExploreContent } = require('../services/explore.services');
    await updateExploreContent('explore1', userId, { embedUrl: newUrl }, {});

    expect(mediaRecord.embedUrl).toBe(newUrl);
    expect(content.videoFileUrl).toBe(newUrl);
    expect(mediaRecord.save).toHaveBeenCalled();
  });
});
