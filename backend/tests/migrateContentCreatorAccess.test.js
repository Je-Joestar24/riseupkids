/**
 * Content creator access areas (step B6): the migration script. Real in-memory MongoDB, because what matters is what
 * ends up stored (and what is left alone), and a mocked query cannot show that.
 * @see docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md
 */
const mongoose = require('mongoose');
const { execFileSync } = require('child_process');
const path = require('path');

const { User } = require('../models');
const logger = require('../config/logger');
const { LEGACY_CREATOR_AREAS, ACCESS_AREA_KEYS, effectiveAreas } = require('../utils/accessAreas');
const {
  migrateContentCreatorAccess,
  parseArgs,
  formatReport,
  UsageError,
} = require('../scripts/migrateContentCreatorAccess');

jest.setTimeout(60000);

let mongod;
let infoSpy;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(() => {
  infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
});

afterEach(async () => {
  infoSpy.mockRestore();
  await User.deleteMany({});
});

const raw = (id) => User.collection.findOne({ _id: new mongoose.Types.ObjectId(String(id)) });

/** A user stored exactly as older creators are: no access fields at all. */
async function insertRaw(fields) {
  const { insertedId } = await User.collection.insertOne({
    name: fields.name || 'Person',
    email: `${(fields.name || 'person').toLowerCase()}@example.com`,
    password: 'x'.repeat(60),
    role: 'content_creator',
    isActive: true,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...fields,
  });
  return insertedId;
}

const snapshot = async () =>
  (await User.collection.find({}).sort({ email: 1 }).toArray()).map((doc) => JSON.stringify(doc));

describe('parseArgs', () => {
  it('with nothing is the fill', () => {
    expect(parseArgs([])).toEqual({ mode: 'fill', dryRun: false });
    expect(parseArgs(['--dry-run'])).toEqual({ mode: 'fill', dryRun: true });
  });

  it('reads one creator and a list, in canonical order without duplicates', () => {
    expect(parseArgs(['--email=Pat@Example.com', '--areas=experiences, notifications,notifications'])).toEqual({
      mode: 'one',
      dryRun: false,
      email: 'pat@example.com',
      areas: ['notifications', 'experiences'],
    });
  });

  it('reads --all with a list, and --dry-run in any position', () => {
    expect(parseArgs(['--dry-run', '--all', '--areas=contents,explore'])).toEqual({
      mode: 'all',
      dryRun: true,
      email: undefined,
      areas: ['contents', 'explore'],
    });
  });

  it('also reads the value after a space', () => {
    expect(parseArgs(['--email', 'pat@example.com', '--areas', 'notifications'])).toEqual(
      expect.objectContaining({ mode: 'one', email: 'pat@example.com', areas: ['notifications'] })
    );
  });

  it.each([
    [['--nope'], /Unknown option: --nope/],
    [['--all'], /need --areas/],
    [['--email=a@b.co'], /need --areas/],
    [['--areas=contents'], /needs --email=<address> or --all/],
    [['--all', '--email=a@b.co', '--areas=contents'], /either --all or --email/],
    [['--email='], /--email needs an address/],
    [['--email'], /--email needs an address/],
    [['--all', '--areas='], /--areas needs a list/],
    [['--all', '--areas'], /--areas needs a list/],
    [['--all', '--areas=contents,billing'], /Unknown area: billing\./],
    [['--all', '--areas=contents,,explore'], /Unknown area/],
    [['--all', '--areas=Contents'], /Unknown area: Contents\./],
    [['--dry-run=yes'], /--dry-run does not take a value/],
    [['--all=yes', '--areas=contents'], /--all does not take a value/],
    [['all'], /Unknown option: all/],
  ])('refuses %j with a plain sentence', (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(UsageError);
    expect(() => parseArgs(argv)).toThrow(message);
  });
});

describe('fill (the default): creators with no list get what they could already use', () => {
  it('gives the legacy set to creators with no list, however "no list" is stored', async () => {
    const missing = await insertRaw({ name: 'Missing' });
    const nulled = await insertRaw({ name: 'Nulled', accessAreas: null });
    const empty = await insertRaw({ name: 'Empty', accessAreas: [] });

    const report = await migrateContentCreatorAccess({ mode: 'fill' });

    expect(report).toEqual(expect.objectContaining({ mode: 'fill', dryRun: false, found: 3, updated: 3, unchanged: 0, skipped: 0 }));
    for (const id of [missing, nulled, empty]) {
      const stored = await raw(id);
      expect(stored.accessAreas).toEqual(LEGACY_CREATOR_AREAS);
      expect(stored.accessUpdatedAt).toBeInstanceOf(Date);
      expect(stored.accessUpdatedBy).toBeNull();
    }
  });

  it('changes nothing about what a creator can do', async () => {
    const id = await insertRaw({ name: 'Same' });
    const before = effectiveAreas(await User.findById(id));

    await migrateContentCreatorAccess({ mode: 'fill' });

    expect(effectiveAreas(await User.findById(id))).toEqual(before);
    expect(before).toEqual(LEGACY_CREATOR_AREAS);
  });

  it('includes archived creators', async () => {
    const id = await insertRaw({ name: 'Archived', isActive: false });

    await migrateContentCreatorAccess({ mode: 'fill' });

    expect((await raw(id)).accessAreas).toEqual(LEGACY_CREATOR_AREAS);
    expect((await raw(id)).isActive).toBe(false);
  });

  it('never overwrites a creator who already has her own list', async () => {
    const id = await insertRaw({ name: 'Mine', accessAreas: ['notifications'], accessUpdatedAt: new Date('2026-01-01') });

    const report = await migrateContentCreatorAccess({ mode: 'fill' });

    expect(report.skipped).toBe(1);
    expect(report.updated).toBe(0);
    const stored = await raw(id);
    expect(stored.accessAreas).toEqual(['notifications']);
    expect(stored.accessUpdatedAt).toEqual(new Date('2026-01-01'));
  });

  it('never touches an admin, a teacher, a parent or a child', async () => {
    for (const role of ['admin', 'teacher', 'parent', 'child']) {
      await insertRaw({ name: role, role });
    }
    const before = await snapshot();

    const report = await migrateContentCreatorAccess({ mode: 'fill' });

    expect(report.found).toBe(0);
    expect(await snapshot()).toEqual(before);
    expect(await User.countDocuments({ accessAreas: { $exists: true } })).toBe(0);
  });

  it('is idempotent: a second run changes nothing', async () => {
    await insertRaw({ name: 'One' });
    await insertRaw({ name: 'Two' });
    await migrateContentCreatorAccess({ mode: 'fill' });
    const after = await snapshot();

    const second = await migrateContentCreatorAccess({ mode: 'fill' });

    expect(second).toEqual(expect.objectContaining({ found: 2, updated: 0, skipped: 2, changes: [] }));
    expect(await snapshot()).toEqual(after);
  });

  it('with --dry-run reports what it would do and writes nothing', async () => {
    await insertRaw({ name: 'One' });
    await insertRaw({ name: 'Mine', accessAreas: ['explore'] });
    const before = await snapshot();

    const report = await migrateContentCreatorAccess({ mode: 'fill', dryRun: true });

    expect(report).toEqual(expect.objectContaining({ dryRun: true, found: 2, updated: 0, skipped: 1 }));
    expect(report.changes).toEqual([
      expect.objectContaining({ email: 'one@example.com', before: LEGACY_CREATOR_AREAS, after: LEGACY_CREATOR_AREAS }),
    ]);
    expect(await snapshot()).toEqual(before);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('leaves everything else on the creator alone', async () => {
    const id = await insertRaw({ name: 'Keep', isActive: true });
    const before = await raw(id);

    await migrateContentCreatorAccess({ mode: 'fill' });

    const after = await raw(id);
    for (const field of ['name', 'email', 'password', 'role', 'isActive', 'tokenVersion', 'createdAt']) {
      expect(after[field]).toEqual(before[field]);
    }
  });

  it('works when there are no creators at all', async () => {
    expect(await migrateContentCreatorAccess({ mode: 'fill' })).toEqual(
      expect.objectContaining({ found: 0, updated: 0, unchanged: 0, skipped: 0, changes: [] })
    );
  });
});

describe('one creator: --email and --areas', () => {
  it('sets exactly that list for that creator, and no one else', async () => {
    const target = await insertRaw({ name: 'Target' });
    const other = await insertRaw({ name: 'Other' });

    const report = await migrateContentCreatorAccess({ mode: 'one', email: 'target@example.com', areas: ['experiences', 'notifications'] });

    expect(report).toEqual(expect.objectContaining({ mode: 'one', found: 1, updated: 1, areas: ['notifications', 'experiences'] }));
    expect((await raw(target)).accessAreas).toEqual(['notifications', 'experiences']);
    expect((await raw(other)).accessAreas).toBeUndefined();
  });

  it('replaces a list she already has', async () => {
    const id = await insertRaw({ name: 'Target', accessAreas: LEGACY_CREATOR_AREAS });

    await migrateContentCreatorAccess({ mode: 'one', email: 'target@example.com', areas: ['notifications'] });

    expect((await raw(id)).accessAreas).toEqual(['notifications']);
  });

  it('finds the email whatever its letter case', async () => {
    const id = await insertRaw({ name: 'Target' });

    await migrateContentCreatorAccess({ mode: 'one', email: '  TARGET@Example.com ', areas: ['explore'] });

    expect((await raw(id)).accessAreas).toEqual(['explore']);
  });

  it('is idempotent: the same list again says "already set" and writes nothing', async () => {
    const id = await insertRaw({ name: 'Target' });
    await migrateContentCreatorAccess({ mode: 'one', email: 'target@example.com', areas: ['explore'] });
    const stamp = (await raw(id)).accessUpdatedAt;
    infoSpy.mockClear();

    const second = await migrateContentCreatorAccess({ mode: 'one', email: 'target@example.com', areas: ['explore'] });

    expect(second).toEqual(expect.objectContaining({ updated: 0, unchanged: 1, changes: [] }));
    expect((await raw(id)).accessUpdatedAt).toEqual(stamp);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('refuses an email nobody has, and writes nothing', async () => {
    await insertRaw({ name: 'Target' });
    const before = await snapshot();

    await expect(migrateContentCreatorAccess({ mode: 'one', email: 'ghost@example.com', areas: ['explore'] })).rejects.toThrow(/No user has the email/);
    expect(await snapshot()).toEqual(before);
  });

  it.each(['admin', 'teacher', 'parent'])('refuses a %s, says what they are, and writes nothing', async (role) => {
    await insertRaw({ name: role, role });
    const before = await snapshot();

    await expect(migrateContentCreatorAccess({ mode: 'one', email: `${role}@example.com`, areas: ['explore'] })).rejects.toThrow(
      new RegExp(`not a content creator \\(they are a ${role}\\)`)
    );
    expect(await snapshot()).toEqual(before);
  });

  it('refuses a missing email', async () => {
    await expect(migrateContentCreatorAccess({ mode: 'one', areas: ['explore'] })).rejects.toThrow(UsageError);
  });

  it('with --dry-run writes nothing', async () => {
    const id = await insertRaw({ name: 'Target' });

    const report = await migrateContentCreatorAccess({ mode: 'one', dryRun: true, email: 'target@example.com', areas: ['notifications'] });

    expect(report.changes).toEqual([expect.objectContaining({ before: LEGACY_CREATOR_AREAS, after: ['notifications'] })]);
    expect((await raw(id)).accessAreas).toBeUndefined();
  });
});

describe('all creators: --all and --areas', () => {
  it('sets the same list for every creator, including ones with no list and ones with another list', async () => {
    const a = await insertRaw({ name: 'A' });
    const b = await insertRaw({ name: 'B', accessAreas: ['notifications'] });
    const c = await insertRaw({ name: 'C', isActive: false });

    const report = await migrateContentCreatorAccess({ mode: 'all', areas: ['contents', 'explore'] });

    expect(report).toEqual(expect.objectContaining({ mode: 'all', found: 3, updated: 3 }));
    for (const id of [a, b, c]) expect((await raw(id)).accessAreas).toEqual(['contents', 'explore']);
  });

  it('leaves every non-creator alone', async () => {
    for (const role of ['admin', 'teacher', 'parent']) await insertRaw({ name: role, role });
    await insertRaw({ name: 'Creator' });
    const people = await User.collection.find({ role: { $ne: 'content_creator' } }).toArray();

    await migrateContentCreatorAccess({ mode: 'all', areas: ['explore'] });

    const after = await User.collection.find({ role: { $ne: 'content_creator' } }).toArray();
    expect(after.map((doc) => JSON.stringify(doc))).toEqual(people.map((doc) => JSON.stringify(doc)));
    expect(await User.countDocuments({ role: { $ne: 'content_creator' }, accessAreas: { $exists: true } })).toBe(0);
  });

  it('writes a creator down with the legacy set when that is the list asked for (she had no saved list)', async () => {
    const id = await insertRaw({ name: 'A' });

    const report = await migrateContentCreatorAccess({ mode: 'all', areas: LEGACY_CREATOR_AREAS });

    expect(report.updated).toBe(1);
    expect((await raw(id)).accessAreas).toEqual(LEGACY_CREATOR_AREAS);
  });

  it('is idempotent', async () => {
    await insertRaw({ name: 'A' });
    await insertRaw({ name: 'B' });
    await migrateContentCreatorAccess({ mode: 'all', areas: ['explore'] });
    const after = await snapshot();

    const second = await migrateContentCreatorAccess({ mode: 'all', areas: ['explore'] });

    expect(second).toEqual(expect.objectContaining({ found: 2, updated: 0, unchanged: 2, changes: [] }));
    expect(await snapshot()).toEqual(after);
  });

  it('with --dry-run lists who would change and writes nothing', async () => {
    await insertRaw({ name: 'A' });
    await insertRaw({ name: 'B', accessAreas: ['explore'] });
    const before = await snapshot();

    const report = await migrateContentCreatorAccess({ mode: 'all', dryRun: true, areas: ['explore'] });

    expect(report.changes.map((change) => change.email)).toEqual(['a@example.com']);
    expect(report.unchanged).toBe(1);
    expect(await snapshot()).toEqual(before);
  });

  it('writes one log line per creator that changed: before, after, added and removed', async () => {
    const id = await insertRaw({ name: 'A' });

    await migrateContentCreatorAccess({ mode: 'all', areas: ['explore', 'notifications'] });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        event: 'content_creator_access_changed',
        source: 'migrateContentCreatorAccess',
        actorId: null,
        creatorId: String(id),
        before: LEGACY_CREATOR_AREAS,
        after: ['explore', 'notifications'],
        added: ['notifications'],
        removed: ['dashboard', 'contents', 'built_in_books', 'star_cam_missions'],
      })
    );
  });

  it('keeps emails, names and passwords out of the log line', async () => {
    await insertRaw({ name: 'A' });

    await migrateContentCreatorAccess({ mode: 'all', areas: ['explore'] });

    const logged = JSON.stringify(infoSpy.mock.calls);
    expect(logged).not.toContain('a@example.com');
    expect(logged).not.toContain('xxxxxxxx');
  });
});

describe('a bad list is refused before anything is written', () => {
  it.each([
    ['an unknown area', ['contents', 'payroll'], /Unknown area: payroll\./],
    ['an empty list', [], /Choose at least one area/],
    ['no list', undefined, /Choose at least one area/],
    ['text instead of a list', 'contents', /must be a list/],
    ['a wrong-case area', ['Contents'], /Unknown area: Contents\./],
  ])('%s, in "all" mode', async (_label, areas, message) => {
    await insertRaw({ name: 'A' });
    const before = await snapshot();

    await expect(migrateContentCreatorAccess({ mode: 'all', areas })).rejects.toThrow(message);
    expect(await snapshot()).toEqual(before);
  });

  it('and in "one" mode', async () => {
    await insertRaw({ name: 'A' });
    const before = await snapshot();

    await expect(migrateContentCreatorAccess({ mode: 'one', email: 'a@example.com', areas: ['payroll'] })).rejects.toThrow(UsageError);
    expect(await snapshot()).toEqual(before);
  });

  it('and an unknown mode', async () => {
    await expect(migrateContentCreatorAccess({ mode: 'everything' })).rejects.toThrow(/Unknown mode/);
  });
});

describe('formatReport (what the operator reads)', () => {
  it('shows the counts and who changes, and says so loudly on a dry run', async () => {
    await insertRaw({ name: 'A' });

    const dry = formatReport(await migrateContentCreatorAccess({ mode: 'all', dryRun: true, areas: ['notifications'] }));
    const real = formatReport(await migrateContentCreatorAccess({ mode: 'all', areas: ['notifications'] }));

    expect(dry).toContain('[DRY RUN: nothing was written]');
    expect(dry).toContain('Would change: 1');
    expect(dry).toContain('a@example.com');
    expect(real).not.toContain('DRY RUN');
    expect(real).toContain('Changed: 1');
    expect(real).toContain('Areas: notifications');
  });

  it('shows "already set this way" and "skipped" as the two different numbers they are', () => {
    const text = formatReport({
      mode: 'all', dryRun: false, areas: ['explore'], found: 10, updated: 2, unchanged: 3, skipped: 5, changes: [],
    });

    expect(text).toContain('Content creators found: 10');
    expect(text).toContain('Changed: 2');
    expect(text).toContain('Already set this way: 3');
    expect(text).toContain('Skipped (already have their own list): 5');
  });

  it('shows (none) for someone with no areas before, and the arrow before and after', () => {
    const text = formatReport({
      mode: 'one', dryRun: false, areas: ['explore'], found: 1, updated: 1, unchanged: 0, skipped: 0,
      changes: [{ id: '1', email: 'x@example.com', before: [], after: ['explore'] }],
    });

    expect(text).toContain('x@example.com: (none)  ->  explore');
  });
});

describe('the command line', () => {
  const script = path.join(__dirname, '..', 'scripts', 'migrateContentCreatorAccess.js');
  const run = (...args) => {
    try {
      const stdout = execFileSync(process.execPath, [script, ...args], {
        encoding: 'utf8',
        env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:1/never', NODE_ENV: 'test' },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 20000,
      });
      return { code: 0, stdout, stderr: '' };
    } catch (error) {
      return { code: error.status, stdout: String(error.stdout || ''), stderr: String(error.stderr || '') };
    }
  };

  it('stops on a typo with a plain sentence and the usage, before it tries to connect to any database', () => {
    const result = run('--areas=contents');

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('--areas needs --email=<address> or --all');
    expect(result.stderr).toContain('Usage:');
    expect(result.stderr).not.toMatch(/ECONNREFUSED|MongooseServerSelection/);
  });

  it('names the area it does not know', () => {
    const result = run('--all', '--areas=contents,billing');

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Unknown area: billing.');
  });

  it('is registered as an npm script', () => {
    const pkg = require('../package.json');

    expect(pkg.scripts['migrate:content-creator-access']).toBe('node scripts/migrateContentCreatorAccess.js');
    expect(ACCESS_AREA_KEYS).toContain('notifications');
  });
});
