/**
 * The "Pick your profile" page. Its computer layout (a 384px card, the page locked to the screen height) is
 * recorded here, and every phone fix must live inside a phone-only media block, so a normal computer window
 * never gets them. (jsdom does not apply media rules, so the stylesheet text itself is read.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { PHONE_LANDSCAPE_QUERY } from '../../hooks/usePlayerViewport';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(HERE, 'ParentsChild.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Top-level rules as { header, body }. */
const rulesIn = (text) => {
  const rules = [];
  let depth = 0;
  let headerStart = 0;
  let open = 0;
  let header = '';
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '{') {
      if (depth === 0) {
        header = text.slice(headerStart, i).trim().replace(/\s+/g, ' ');
        open = i;
      }
      depth += 1;
    } else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        rules.push({ header, body: text.slice(open + 1, i) });
        headerStart = i + 1;
      }
    }
  }
  return rules;
};

const declarations = (body) =>
  Object.fromEntries(
    body
      .split(';')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const at = line.indexOf(':');
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      })
  );

const top = rulesIn(css);
const plain = top.filter((rule) => !rule.header.startsWith('@media'));
const medias = top.filter((rule) => rule.header.startsWith('@media'));
const plainRule = (selector) => declarations(plain.find((rule) => rule.header === selector).body);
const mediaRule = (mediaHeader, selector) => {
  const media = medias.find((rule) => rule.header === mediaHeader);
  const inner = rulesIn(media.body).filter((rule) => rule.header === selector);
  return Object.assign({}, ...inner.map((rule) => declarations(rule.body)));
};

const PHONE_UPRIGHT = '@media (max-width: 600px)';
const PHONE_SIDEWAYS = `@media ${PHONE_LANDSCAPE_QUERY}`;

describe('Pick-your-profile page: the computer layout (today)', () => {
  it('keeps the page locked to the screen height, centred', () => {
    const page = plainRule('.parents-child-page');
    expect(page.height).toBe('100vh');
    expect(page['max-height']).toBe('100vh');
    expect(page['min-height']).toBe('100vh');
    expect(page.overflow).toBe('hidden');
    expect(page.padding).toBe('2rem 1rem');
    expect(page['align-items']).toBe('center');
  });

  it('keeps the 384px card with 32px of padding', () => {
    expect(plainRule('.parents-child-card')).toMatchObject({ width: 'fit-content', padding: '32px', margin: 'auto' });
    expect(plainRule('.parents-child-card-content').width).toBe('384px');
  });
});

describe('Pick-your-profile page: the phone fixes', () => {
  it('has them only inside two phone-only media blocks', () => {
    expect(medias.map((rule) => rule.header)).toContain(PHONE_UPRIGHT);
    expect(medias.map((rule) => rule.header)).toContain(PHONE_SIDEWAYS);
  });

  it('never lets the page grow or scroll outside those blocks', () => {
    plain.forEach((rule) => {
      const found = declarations(rule.body);
      expect(found.overflow, rule.header).not.toBe('visible');
      expect(found.height, rule.header).not.toBe('auto');
    });
  });

  it('on a narrow screen: the page grows and scrolls, and the card takes the screen width', () => {
    const page = mediaRule(PHONE_UPRIGHT, '.parents-child-page');
    expect(page).toMatchObject({ height: 'auto', 'max-height': 'none', overflow: 'visible', padding: '1rem' });
    expect(mediaRule(PHONE_UPRIGHT, '.parents-child-page .parents-child-card')).toMatchObject({ width: '100%', padding: '0' });
    expect(mediaRule(PHONE_UPRIGHT, '.parents-child-card-content')).toMatchObject({ width: '100%', 'box-sizing': 'border-box' });
    expect(mediaRule(PHONE_UPRIGHT, '.parents-child-page .parents-child-container')).toMatchObject({
      'padding-left': '0',
      'padding-right': '0',
    });
  });

  it('on a sideways touch phone: the page can scroll', () => {
    expect(mediaRule(PHONE_SIDEWAYS, '.parents-child-page')).toMatchObject({
      height: 'auto',
      'max-height': 'none',
      overflow: 'visible',
    });
    expect(PHONE_SIDEWAYS).toContain('(hover: none) and (pointer: coarse)');
  });
});
