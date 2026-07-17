import {
  buildLoopingVideoHtml,
  CMS_LOOPING_VIDEO_READY_MESSAGE,
} from '@/components/child/common/cms-looping-video-html';

describe('buildLoopingVideoHtml', () => {
  it('uses transparent page background and video poster for instant cover image', () => {
    const html = buildLoopingVideoHtml(
      'https://cdn.example.com/demo.mp4',
      'https://cdn.example.com/cover.png'
    );

    expect(html).toContain('background: transparent');
    expect(html).toContain('preload="auto"');
    expect(html).toContain('https://cdn.example.com/demo.mp4');
    expect(html).toContain('https://cdn.example.com/cover.png');
    expect(html).toContain(CMS_LOOPING_VIDEO_READY_MESSAGE);
  });
});
