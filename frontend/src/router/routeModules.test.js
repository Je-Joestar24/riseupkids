import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';

/**
 * The lazy loading hands the router `module.default`. If a page ever stopped having a default export (or a
 * path in routeComponents.js / lazyModals.jsx were mistyped), the page would only fail when somebody
 * opened it. This test loads every module the on-demand doors point to, with the real code, and checks
 * that each one has a default export that can be drawn.
 */
vi.setConfig({ testTimeout: 120000, hookTimeout: 120000 });

const HERE = path.dirname(fileURLToPath(import.meta.url));

const loaders = import.meta.glob([
  '../pages/**/*.jsx',
  '../layouts/*.jsx',
  './ChildShell.jsx',
  '../components/child/common/{VideoPlayerModal,ScormPlayer,cmsPLayer}.jsx',
  '../components/child/module/{AudioAssignmentRecordingModal,ChantRecordingModal}.jsx',
]);

/** Every `import('...')` target written in a source file, as a key of `loaders`. */
const doorsIn = (file) => {
  const source = fs.readFileSync(path.resolve(HERE, file), 'utf8');
  const targets = [...source.matchAll(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g)].map((match) => match[1]);
  return targets.map((target) => {
    const absolute = path.resolve(path.dirname(path.resolve(HERE, file)), target);
    const relative = path.relative(HERE, absolute).replace(/\\/g, '/');
    const withDot = relative.startsWith('.') ? relative : `./${relative}`;
    return { target, key: `${withDot}.jsx` };
  });
};

const doors = [
  ...doorsIn('./routeComponents.js').map((door) => ({ ...door, from: 'routeComponents.js' })),
  ...doorsIn('../components/child/common/lazyModals.jsx').map((door) => ({ ...door, from: 'lazyModals.jsx' })),
];

describe('on-demand doors', () => {
  it('finds the doors (the checks below would otherwise pass on nothing)', () => {
    expect(doors.filter((door) => door.from === 'routeComponents.js').length).toBeGreaterThanOrEqual(45);
    expect(doors.filter((door) => door.from === 'lazyModals.jsx')).toHaveLength(5);
  });

  it.each(doors.map((door) => [door.from, door.target, door]))(
    '%s → %s points at a real module with something to draw',
    async (_from, _target, door) => {
      expect(loaders[door.key], `no file for ${door.target}`).toBeTypeOf('function');

      const module = await loaders[door.key]();

      expect(module.default, `${door.target} has no default export`).toBeTruthy();
      expect(['function', 'object']).toContain(typeof module.default);
    }
  );
});
