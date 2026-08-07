import { collectInteractivePageAudioUrls } from '@/components/child/common/cms-player-shared';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';

describe('collectInteractivePageAudioUrls', () => {
  it('collects option and drop-zone audio including .mpeg mislabels', () => {
    const page = {
      type: 'activity_drag_2x2',
      interaction: {
        options: [
          {
            optionId: 'option_one',
            audioMedia: { url: 'https://cdn.example/media/audio/option-a.mpeg' },
          },
          {
            optionId: 'option_two',
            audioUrl: 'https://cdn.example/media/audio/option-b.mp3',
          },
        ],
        dropZones: [
          {
            zoneId: 'zone_1',
            audioMedia: { url: 'https://cdn.example/media/audio/answer-1.mpeg' },
          },
          {
            zoneId: 'zone_2',
            audioUrl: 'https://cdn.example/media/audio/answer-2.m4a',
          },
        ],
      },
    } as unknown as CmsPlayablePage;

    const urls = collectInteractivePageAudioUrls(page);
    expect(urls).toEqual(
      expect.arrayContaining([
        'https://cdn.example/media/audio/option-a.mpeg',
        'https://cdn.example/media/audio/option-b.mp3',
        'https://cdn.example/media/audio/answer-1.mpeg',
        'https://cdn.example/media/audio/answer-2.m4a',
      ])
    );
    expect(urls).toHaveLength(4);
  });

  it('returns empty for non-interactive pages', () => {
    expect(
      collectInteractivePageAudioUrls({ type: 'content', pageId: 'c1' } as CmsPlayablePage)
    ).toEqual([]);
  });
});
