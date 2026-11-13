/**
 * Reads the responsive style rules Material UI generated for one element, split the way the phone work uses them:
 *
 *   phone   - the rules for `xs` values (under 600px; Material UI writes them as `(min-width:0px)`)
 *   desktop - the rules for `sm` values (600px and wider: tablets and computers)
 *   wide    - the rules for `md` values (900px and wider: laptops and computers; only for pages that set an `md` value)
 *   base    - rules that apply at every width
 *
 * Each part is an object of `property: value` (rules for `:hover` are keyed `hover:property`, and rules for something
 * inside the element are keyed `selector|property`, e.g. `svg|width`).
 * Used to prove that the phone adjustments never change what a tablet or computer sees.
 */

const PHONE = '(min-width:0px)';
const DESKTOP = '(min-width:600px)';
const WIDE = '(min-width:900px)';

const squash = (text) => String(text).replace(/\s+/g, '');

/** "a: b; c: d(e, f);" -> { a: 'b', c: 'd(e, f)' } */
const declarations = (body) => {
  const out = {};
  let depth = 0;
  let current = '';
  const flush = () => {
    const at = current.indexOf(':');
    if (at > 0) out[current.slice(0, at).trim()] = current.slice(at + 1).trim();
    current = '';
  };
  for (const ch of body) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ';' && depth === 0) flush();
    else current += ch;
  }
  if (current.trim()) flush();
  return out;
};

const styleRule = (rule, classes) => {
  const match = /^([^{]+)\{([\s\S]*)\}\s*$/.exec(rule.cssText.trim());
  if (!match) return null;
  const selector = match[1].trim();
  for (const name of classes) {
    if (selector === `.${name}`) return { prefix: '', props: declarations(match[2]) };
    if (selector === `.${name}:hover`) return { prefix: 'hover:', props: declarations(match[2]) };
    // a rule aimed at something inside the element (e.g. `& svg`), keyed `svg|property`
    if (selector.startsWith(`.${name} `)) return { prefix: `${selector.slice(name.length + 2)}|`, props: declarations(match[2]) };
  }
  return null;
};

export const readResponsiveCss = (element) => {
  const classes = [...element.classList].filter((name) => name.startsWith('css-'));
  const result = { base: {}, phone: {}, desktop: {}, wide: {} };

  const walk = (rules, part) => {
    for (const rule of rules) {
      if (rule.media) {
        const condition = squash(rule.media.mediaText);
        const next =
          condition === squash(PHONE) ? 'phone' : condition === squash(DESKTOP) ? 'desktop' : condition === squash(WIDE) ? 'wide' : null;
        if (next) walk(rule.cssRules, next);
      } else if (rule.selectorText || rule.cssText) {
        const found = styleRule(rule, classes);
        if (found) {
          Object.entries(found.props).forEach(([name, value]) => {
            result[part][`${found.prefix}${name}`] = value;
          });
        }
      }
    }
  };

  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // not readable
    }
    walk(rules, 'base');
  }
  return result;
};
