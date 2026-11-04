import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { CHILD_PAGES } from './routeTable';

/**
 * Guards the code splitting. A page that is loaded on demand only stays on demand while nothing that is
 * downloaded up front imports it with a plain `import ... from`. This test follows the plain imports of
 * the first download, and of the child area, and fails the moment one of them reaches code that belongs
 * to another area (an admin page, the parent dashboard, a pop-up that should load on demand...).
 * `import('...')` calls are the on-demand doors and are deliberately not followed.
 */

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSIONS = ['', '.js', '.jsx', '/index.js', '/index.jsx'];
const STATIC_IMPORT = /(?:^|\n)\s*(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;

const resolveImport = (from, specifier) => {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), specifier);
  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
};

/** Every source file reachable from `entries` through plain imports, and the packages they import. */
const reachable = (entries) => {
  const files = new Set();
  const packages = new Set();
  const stack = entries.map((entry) => path.resolve(SRC, entry));

  while (stack.length) {
    const file = stack.pop();
    if (files.has(file)) continue;
    files.add(file);

    const source = fs.readFileSync(file, 'utf8');
    STATIC_IMPORT.lastIndex = 0;
    let match;
    while ((match = STATIC_IMPORT.exec(source))) {
      const resolved = resolveImport(file, match[1]);
      if (resolved) {
        stack.push(resolved);
      } else if (!match[1].startsWith('.')) {
        const parts = match[1].split('/');
        packages.add(match[1].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
      }
    }
  }

  return {
    files: [...files].map((file) => path.relative(SRC, file).replace(/\\/g, '/')),
    packages: [...packages],
  };
};

// One small helper that builds media addresses. It lives in the admin book-tester folder but the book
// player service (and so the store) uses it too, so every visitor gets it. Nothing else from there may come.
const SHARED_HELPER = 'components/admin/common/cmsTest/shared.js';

const matching = (files, pattern) => files.filter((file) => pattern.test(file) && file !== SHARED_HELPER);

const OTHER_AREAS =
  /^(pages\/(admin|teacher|parents|contentcreator)\/|layouts\/(Admin|Teacher|Parents|ContentCreator)Layout|components\/(admin|parents|teacher)\/)/;

const LAZY_POPUPS =
  /(components\/child\/common\/(VideoPlayerModal|ScormPlayer)|components\/child\/module\/(AudioAssignmentRecordingModal|ChantRecordingModal))\.jsx$/;

describe('what is downloaded up front', () => {
  const { files, packages } = reachable(['main.jsx']);

  it('reaches no admin, teacher, parent or content-creator page, layout or component', () => {
    expect(matching(files, OTHER_AREAS)).toEqual([]);
  });

  it('reaches no child page, the child frame, or a child pop-up', () => {
    expect(matching(files, /^pages\/child\/|^layouts\/ChildLayout|^router\/ChildShell|^components\/child\/(?!common\/ChildSkeleton)/)).toEqual([]);
  });

  it('does not pull in the drag-and-drop or payment libraries', () => {
    expect(packages).not.toContain('@dnd-kit/core');
    expect(packages).not.toContain('@dnd-kit/sortable');
    expect(packages).not.toContain('@stripe/stripe-js');
  });

  it('still includes the sign-in page (the front door ships with the first download)', () => {
    expect(files).toContain('pages/auth/AuthLogin.jsx');
  });

  it('includes the router and the route table', () => {
    expect(files).toContain('router/AppRouter.jsx');
    expect(files).toContain('router/routeTable.js');
  });
});

describe('what the child area downloads', () => {
  const entries = [
    'router/ChildShell.jsx',
    ...CHILD_PAGES.map((route) => `pages/child/${route.page}.jsx`),
  ];
  const { files, packages } = reachable(entries);

  it('reaches no admin, teacher, parent or content-creator page, layout or component', () => {
    // The book player the pop-ups use lives under components/admin; it is reached through the pop-ups,
    // which load on demand (checked below), so nothing from that folder may be reached directly.
    expect(matching(files, OTHER_AREAS)).toEqual([]);
  });

  it('reaches the video, interactive-content and recording pop-ups only through on-demand loading', () => {
    expect(matching(files, LAZY_POPUPS)).toEqual([]);
  });

  it('does not pull in the drag-and-drop or payment libraries', () => {
    expect(packages).not.toContain('@dnd-kit/core');
    expect(packages).not.toContain('@dnd-kit/sortable');
    expect(packages).not.toContain('@stripe/stripe-js');
  });

  it('every child page file exists (the walk would otherwise quietly see nothing)', () => {
    CHILD_PAGES.forEach((route) => {
      expect(files).toContain(`pages/child/${route.page}.jsx`);
    });
    expect(files).toContain('layouts/ChildLayout.jsx');
  });
});

describe('the on-demand doors', () => {
  it('the pop-ups are reachable through the lazy wrapper, so they do load when asked for', () => {
    const lazy = fs.readFileSync(path.resolve(SRC, 'components/child/common/lazyModals.jsx'), 'utf8');
    ['VideoPlayerModal', 'ScormPlayer', 'AudioAssignmentRecordingModal', 'ChantRecordingModal'].forEach((name) => {
      expect(lazy).toMatch(new RegExp(`import\\([^)]*${name}`));
    });
  });
});
