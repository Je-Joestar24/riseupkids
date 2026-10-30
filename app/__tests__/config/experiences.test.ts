import { readFileSync } from 'fs';
import { join } from 'path';

import {
  EXPERIENCES,
  bunnyLinkFromEnv,
  experienceHomePath,
  getCurrentExperience,
  isOwnDomainHttpsUrl,
  type Experience,
} from '@/config/experiences';
import { findExperienceProblems } from '@/config/experiencesValidation';

const appRoot = join(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(appRoot, ...parts), 'utf8');

const valid: Experience = {
  id: 'sample',
  title: 'Sample',
  video1: 'https://iframe.mediadelivery.net/embed/123/abc',
  video2: 'https://iframe.mediadelivery.net/embed/123/def',
  printable: { image: null, link: 'https://riseup.kids/downloads/sample.pdf', button: 'Print' },
};

const withPrintableLink = (link: string): Experience => ({
  ...valid,
  printable: { ...valid.printable, link },
});

describe('experience settings', () => {
  it('has at least one episode, and the tab shows the first', () => {
    expect(EXPERIENCES.length).toBeGreaterThan(0);
    expect(getCurrentExperience()).toBe(EXPERIENCES[0]);
  });

  it('every real episode passes the store-rule checks', () => {
    for (const experience of EXPERIENCES) {
      expect(findExperienceProblems(experience)).toEqual([]);
    }
  });

  it('episode ids are unique', () => {
    const ids = EXPERIENCES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('video links from the app settings', () => {
  const VIDEO1 = 'EXPO_PUBLIC_EXPERIENCE_SMOOTHIE_VIDEO1';
  const VIDEO2 = 'EXPO_PUBLIC_EXPERIENCE_SMOOTHIE_VIDEO2';
  const original = { [VIDEO1]: process.env[VIDEO1], [VIDEO2]: process.env[VIDEO2] };

  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const loadCurrent = () => {
    let current!: Experience;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      current = require('@/config/experiences').getCurrentExperience();
    });
    return current;
  };

  it('uses the two Bunny links from the settings, in order, always on the iframe host', () => {
    process.env[VIDEO1] = ' https://iframe.mediadelivery.net/embed/1/first ';
    process.env[VIDEO2] = 'https://player.mediadelivery.net/embed/1/second';

    const current = loadCurrent();

    expect(current.video1).toBe('https://iframe.mediadelivery.net/embed/1/first');
    expect(current.video2).toBe('https://iframe.mediadelivery.net/embed/1/second');
    expect(findExperienceProblems(current)).toEqual([]);
  });

  it('has the two website videos built in, so the page works with no settings at all', () => {
    delete process.env[VIDEO1];
    delete process.env[VIDEO2];

    const current = loadCurrent();

    // The iframe host, like the client's template and the app's other Bunny content.
    expect(current.video1).toMatch(/^https:\/\/iframe\.mediadelivery\.net\/embed\/\d+\/[0-9a-f-]+$/);
    expect(current.video2).toMatch(/^https:\/\/iframe\.mediadelivery\.net\/embed\/\d+\/[0-9a-f-]+$/);
    expect(current.video1).not.toBe(current.video2);
    expect(findExperienceProblems(current)).toEqual([]);
  });

  it('ignores anything that is not a Bunny embed link and keeps the built-in videos', () => {
    delete process.env[VIDEO1];
    delete process.env[VIDEO2];
    const builtIn = loadCurrent();

    process.env[VIDEO1] = 'https://www.youtube.com/embed/abc';
    process.env[VIDEO2] = 'http://iframe.mediadelivery.net/embed/1/second';
    const current = loadCurrent();

    expect(current.video1).toBe(builtIn.video1);
    expect(current.video2).toBe(builtIn.video2);
  });

  it.each([
    [undefined, ''],
    ['', ''],
    ['   ', ''],
    ['not a link', ''],
    ['https://iframe.mediadelivery.net/play/1/a', ''],
    ['https://iframe.mediadelivery.net/embed/1/a', 'https://iframe.mediadelivery.net/embed/1/a'],
    ['https://player.mediadelivery.net/embed/1/a', 'https://iframe.mediadelivery.net/embed/1/a'],
    ['https://player.mediadelivery.net.evil.example/embed/1/a', ''],
  ])('bunnyLinkFromEnv(%p) is %p', (value, expected) => {
    expect(bunnyLinkFromEnv(value)).toBe(expected);
  });
});

describe('isOwnDomainHttpsUrl — the only links the Print button will open', () => {
  it('accepts https links on our own domain', () => {
    expect(isOwnDomainHttpsUrl('https://riseup.kids/downloads/recipe.pdf')).toBe(true);
    expect(isOwnDomainHttpsUrl('https://www.riseup.kids/a.pdf')).toBe(true);
    expect(isOwnDomainHttpsUrl(' https://RISEUP.kids/a.pdf ')).toBe(true);
  });

  it.each([
    'http://riseup.kids/a.pdf',
    'https://example.com/a.pdf',
    'https://riseup.kids.evil.example/a.pdf',
    'https://evil.example/riseup.kids/a.pdf',
    'https://www.instagram.com/riseupkids1/',
    'https://wa.me/5511999999999',
    'javascript:alert(1)',
    'riseup.kids/a.pdf',
    '',
  ])('rejects %s', (link) => {
    expect(isOwnDomainHttpsUrl(link)).toBe(false);
  });
});

describe('findExperienceProblems — no outside links, no social links', () => {
  it('asks for the iframe.mediadelivery.net link, so every link is written the same way', () => {
    const problems = findExperienceProblems({
      ...valid,
      video1: 'https://player.mediadelivery.net/embed/123/abc',
    });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/iframe\.mediadelivery\.net/);
  });

  it('accepts a correct entry, and empty video links (placeholders)', () => {
    expect(findExperienceProblems(valid)).toEqual([]);
    expect(findExperienceProblems({ ...valid, video1: '', video2: '' })).toEqual([]);
    expect(findExperienceProblems(withPrintableLink(''))).toEqual([]);
  });

  it.each([
    ['plain http', 'http://iframe.mediadelivery.net/embed/1/a'],
    ['another video site', 'https://www.youtube.com/embed/abc'],
    ['a look-alike host', 'https://iframe.mediadelivery.net.evil.example/embed/1/a'],
    ['a Bunny link that is not an embed', 'https://iframe.mediadelivery.net/play/1/a'],
    ['not a link', 'watch this'],
  ])('rejects a video link that is %s', (_label, link) => {
    expect(findExperienceProblems({ ...valid, video1: link }).length).toBeGreaterThan(0);
    expect(findExperienceProblems({ ...valid, video2: link }).length).toBeGreaterThan(0);
  });

  it.each([
    'https://www.instagram.com/riseupkids1/',
    'https://www.tiktok.com/@riseup.kids',
    'https://example.com/file.pdf',
    'http://riseup.kids/file.pdf',
  ])('rejects a printable link that is not https on our own domain: %s', (link) => {
    expect(findExperienceProblems(withPrintableLink(link)).length).toBeGreaterThan(0);
  });

  it('rejects an empty title or an empty print button', () => {
    expect(findExperienceProblems({ ...valid, title: ' ' }).length).toBeGreaterThan(0);
    expect(
      findExperienceProblems({ ...valid, printable: { ...valid.printable, button: '' } }).length
    ).toBeGreaterThan(0);
  });
});

describe('the Experience page and route', () => {
  it('the page and screen code have no hard-coded web addresses and open no outside links', () => {
    const files = [
      ['components', 'child', 'experience', 'experience-view.tsx'],
      ['app', 'child', '[id]', 'experience.tsx'],
    ];

    for (const file of files) {
      const source = read(...file);

      expect(source).not.toMatch(/https?:\/\//);
      expect(source).not.toMatch(/Linking\.openURL/);
      expect(source).not.toMatch(/instagram|facebook|tiktok|pinterest|youtube|whatsapp/i);
    }
  });

  it('the printable picture is shown in the same shape as the file, so it is never stretched or padded', () => {
    const file = readFileSync(join(appRoot, 'assets', 'images', 'experience', 'strawberry-banana-smoothie-printable.jpg'));

    // JPEG: read the size from the start-of-frame marker.
    let offset = 2;
    let size: { width: number; height: number } | null = null;
    while (offset < file.length && file[offset] === 0xff) {
      const marker = file[offset + 1];
      const length = file.readUInt16BE(offset + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        size = { height: file.readUInt16BE(offset + 5), width: file.readUInt16BE(offset + 7) };
        break;
      }
      offset += 2 + length;
    }

    const shape = read('components', 'child', 'experience', 'experience-view.tsx').match(
      /printableImage:[^}]*aspectRatio:\s*(\d+)\s*\/\s*(\d+)/
    );
    expect(size).not.toBeNull();
    expect(shape).not.toBeNull();
    expect({ width: Number(shape![1]), height: Number(shape![2]) }).toEqual(size);
  });

  it("\"Back to home\" goes to the child's home screen inside the app", () => {
    expect(experienceHomePath('abc123')).toBe('/child/abc123/home');
  });

  it('is registered in the child layout', () => {
    expect(read('app', 'child', '[id]', '_layout.tsx')).toContain('<Stack.Screen name="experience" />');
  });
});
