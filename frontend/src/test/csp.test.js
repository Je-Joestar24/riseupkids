import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const indexHtmlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../index.html'
);
const html = readFileSync(indexHtmlPath, 'utf-8');

describe('index.html Content-Security-Policy meta tag', () => {
  it('is present', () => {
    expect(html).toMatch(/<meta\s+http-equiv="Content-Security-Policy"/);
  });

  it('restricts script-src to self only (no inline scripts in this SPA)', () => {
    expect(html).toMatch(/script-src 'self';/);
  });

  it('blocks plugins via object-src none', () => {
    expect(html).toMatch(/object-src 'none'/);
  });

  it('allows the production API origin for XHR/fetch', () => {
    expect(html).toMatch(/connect-src[^;]*https:\/\/api\.riseup\.kids/);
  });
});
