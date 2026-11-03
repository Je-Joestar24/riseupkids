/**
 * Size guard for the pictures bundled with the site. The Home page once shipped a 1.4 MB picture
 * that was shown at 80 px; every child downloaded it on their first visit.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const IMAGES_DIR = join(__dirname, 'images');
const MAX_BYTES = 150 * 1024;

const files = readdirSync(IMAGES_DIR).filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name));
const sizeOf = (name) => statSync(join(IMAGES_DIR, name)).size;

describe('bundled pictures', () => {
  it('finds the pictures', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)('%s is under 150 kB', (name) => {
    expect(sizeOf(name)).toBeLessThanOrEqual(MAX_BYTES);
  });

  it('keeps the two Home pictures small WebP files', () => {
    expect(files).toContain('live.webp');
    expect(files).toContain('sample.webp');
    expect(sizeOf('live.webp')).toBeLessThan(30 * 1024);
    expect(sizeOf('sample.webp')).toBeLessThan(30 * 1024);
  });

  it('no longer has the original large PNGs', () => {
    expect(files).not.toContain('live.png');
    expect(files).not.toContain('sample.png');
  });
});
