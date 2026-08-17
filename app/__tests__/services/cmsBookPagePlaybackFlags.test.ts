import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import {
  buildCmsBookPageFlagsStorageKey,
  isCmsPageAudioHeard,
  isCmsPageVideoPlayed,
  loadCmsBookPagePlaybackRecord,
  markCmsPagePlaybackFlags,
  mergeCmsPagePlaybackFlags,
} from '@/services/cmsBookPagePlaybackFlags';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('cmsBookPagePlaybackFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue(undefined);
  });

  it('builds a versioned storage key', () => {
    expect(buildCmsBookPageFlagsStorageKey('book-1', '3:2026-08-17')).toBe(
      'cms-book-page-flags:book-1:3:2026-08-17'
    );
  });

  it('merges audio and video flags without wiping the other', () => {
    const merged = mergeCmsPagePlaybackFlags(
      {
        audioHeard: true,
        videoPlayed: false,
        audioReason: 'audio_finished',
        updatedAt: '2026-08-17T00:00:00.000Z',
      },
      { videoPlayed: true, videoReason: 'video_finished' }
    );
    expect(merged.audioHeard).toBe(true);
    expect(merged.videoPlayed).toBe(true);
    expect(merged.audioReason).toBe('audio_finished');
    expect(merged.videoReason).toBe('video_finished');
  });

  it('reads previously played pages from storage', async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({
        bookId: 'book-1',
        contentVersion: '1',
        pages: {
          'cover-1': { audioHeard: true, videoPlayed: false, audioReason: 'audio_finished' },
          'demo-1': { audioHeard: false, videoPlayed: true, videoReason: 'video_finished' },
        },
      })
    );

    const record = await loadCmsBookPagePlaybackRecord('book-1', '1');
    expect(isCmsPageAudioHeard(record, 'cover-1')).toBe(true);
    expect(isCmsPageVideoPlayed(record, 'demo-1')).toBe(true);
    expect(isCmsPageAudioHeard(record, 'demo-1')).toBe(false);
  });

  it('persists a newly heard transcript page', async () => {
    const next = await markCmsPagePlaybackFlags('book-1', '1', 'content-2', {
      audioHeard: true,
      audioReason: 'audio_finished',
    });
    expect(isCmsPageAudioHeard(next, 'content-2')).toBe(true);
    expect(storage.setItem).toHaveBeenCalled();
    const saved = JSON.parse(String(storage.setItem.mock.calls[0][1]));
    expect(saved.pages['content-2'].audioHeard).toBe(true);
    expect(saved.pages['content-2'].audioReason).toBe('audio_finished');
  });
});
