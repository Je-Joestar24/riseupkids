const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { User } = require('../models');
const { CONTENT_CREATOR_ROLE, ACCESS_AREA_KEYS, LEGACY_CREATOR_AREAS, validateAreas, effectiveAreas } = require('../utils/accessAreas');

dotenv.config();

// scripts/ is exempt from the no-raw-console CI gate (operator CLI tooling); the structured log line per change goes
// through the logger like the rest of the server.
const logger = (() => {
  try {
    return require('../config/logger');
  } catch {
    return console;
  }
})();

/**
 * Content creator access areas (docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md).
 *
 * Three ways to run it (all idempotent, all accept --dry-run, which writes nothing):
 *
 *   node scripts/migrateContentCreatorAccess.js
 *       FILL: every content creator with no saved access list gets the legacy set (what creators could use before
 *       access areas existed). Changes nothing about what they can do; a creator who already has a list is skipped.
 *
 *   node scripts/migrateContentCreatorAccess.js --email=person@example.com --areas=notifications,experiences
 *       ONE: sets exactly this list for one named creator (replaces whatever she had).
 *
 *   node scripts/migrateContentCreatorAccess.js --all --areas=contents,explore
 *       ALL: sets exactly this list for every content creator (the quick way to reduce everyone at once).
 *
 * Areas: dashboard, contents, built_in_books, explore, star_cam_missions, notifications, experiences
 *
 * Never touches an admin, teacher or parent. A bad area name stops the run before anything is written.
 * Rollback: unset `accessAreas` on the creators (the code treats a missing list as the legacy set).
 */

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

const USAGE = [
  'Usage:',
  '  node scripts/migrateContentCreatorAccess.js [--dry-run]',
  '  node scripts/migrateContentCreatorAccess.js --email=<address> --areas=<a,b,c> [--dry-run]',
  '  node scripts/migrateContentCreatorAccess.js --all --areas=<a,b,c> [--dry-run]',
  `Areas: ${ACCESS_AREA_KEYS.join(', ')}`,
].join('\n');

/**
 * Reads the command line. Throws UsageError (with a plain sentence) for anything unclear, so a typo never turns into
 * a different, wider run than the operator meant.
 * @param {string[]} argv the arguments after the script name
 * @returns {{ mode: 'fill' | 'one' | 'all', dryRun: boolean, email?: string, areas?: string[] }}
 */
function parseArgs(argv = []) {
  const options = { dryRun: false, all: false, email: undefined, areasText: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [flag, ...rest] = arg.split('=');
    const inline = rest.length > 0 ? rest.join('=') : undefined;
    const takeValue = () => {
      if (inline !== undefined) return inline;
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--')) return undefined;
      index += 1;
      return next;
    };

    switch (flag) {
      case '--dry-run':
        if (inline !== undefined) throw new UsageError('--dry-run does not take a value.');
        options.dryRun = true;
        break;
      case '--all':
        if (inline !== undefined) throw new UsageError('--all does not take a value.');
        options.all = true;
        break;
      case '--email': {
        const value = takeValue();
        if (!value || !value.trim()) throw new UsageError('--email needs an address, e.g. --email=person@example.com');
        options.email = value.trim().toLowerCase();
        break;
      }
      case '--areas': {
        const value = takeValue();
        if (value === undefined || !value.trim()) {
          throw new UsageError('--areas needs a list, e.g. --areas=notifications,experiences');
        }
        options.areasText = value;
        break;
      }
      default:
        throw new UsageError(`Unknown option: ${arg}`);
    }
  }

  if (options.all && options.email !== undefined) {
    throw new UsageError('Use either --all or --email, not both.');
  }

  const wantsAreas = options.all || options.email !== undefined;

  if (wantsAreas && options.areasText === undefined) {
    throw new UsageError('--all and --email need --areas, e.g. --areas=notifications,experiences');
  }

  if (!wantsAreas && options.areasText !== undefined) {
    throw new UsageError('--areas needs --email=<address> or --all, so it is clear who gets the list.');
  }

  if (!wantsAreas) {
    return { mode: 'fill', dryRun: options.dryRun };
  }

  const checked = validateAreas(options.areasText.split(',').map((item) => item.trim()));
  if (!checked.ok) {
    throw new UsageError(checked.message);
  }

  return {
    mode: options.all ? 'all' : 'one',
    dryRun: options.dryRun,
    email: options.email,
    areas: checked.areas,
  };
}

const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

/** A creator "has a saved list" only when the field is a non-empty array (Mongoose's [] and null mean "none"). */
const savedListOf = (creator) => (Array.isArray(creator.accessAreas) && creator.accessAreas.length > 0 ? creator.accessAreas : null);

/**
 * Pure data operation: assumes a mongoose connection already exists (see main() for the CLI, which owns it).
 *
 * @param {{ mode: 'fill' | 'one' | 'all', dryRun?: boolean, email?: string, areas?: string[] }} options
 * @returns {Promise<{ mode: string, dryRun: boolean, areas: string[], found: number, updated: number, unchanged: number, skipped: number, changes: Array<{ id: string, email: string, before: string[], after: string[] }> }>}
 */
async function migrateContentCreatorAccess({ mode = 'fill', dryRun = false, email, areas } = {}) {
  if (!['fill', 'one', 'all'].includes(mode)) {
    throw new UsageError(`Unknown mode: ${mode}`);
  }

  // Everything is checked before the first write.
  let target;
  if (mode === 'fill') {
    target = [...LEGACY_CREATOR_AREAS];
  } else {
    const checked = validateAreas(areas);
    if (!checked.ok) throw new UsageError(checked.message);
    target = checked.areas;
  }

  let creators;
  if (mode === 'one') {
    if (!email || typeof email !== 'string') throw new UsageError('A creator email is needed.');
    const person = await User.findOne({ email: email.trim().toLowerCase() }).select('name email role accessAreas');
    if (!person) throw new UsageError(`No user has the email ${email}. Nothing was changed.`);
    if (person.role !== CONTENT_CREATOR_ROLE) {
      throw new UsageError(`${email} is not a content creator (they are a ${person.role}). Nothing was changed.`);
    }
    creators = [person];
  } else {
    creators = await User.find({ role: CONTENT_CREATOR_ROLE }).select('name email role accessAreas');
  }

  const toWrite = [];
  let unchanged = 0;
  let skipped = 0;

  for (const creator of creators) {
    const saved = savedListOf(creator);

    if (mode === 'fill' && saved) {
      skipped += 1; // already has a list: never overwritten by the fill
      continue;
    }
    if (saved && sameList(saved, target)) {
      unchanged += 1; // nothing to do, and a second run lands here
      continue;
    }

    toWrite.push({ creator, before: effectiveAreas(creator), after: target });
  }

  const changes = toWrite.map(({ creator, before, after }) => ({
    id: String(creator._id),
    email: creator.email,
    before,
    after,
  }));

  if (!dryRun && toWrite.length > 0) {
    await User.updateMany(
      { _id: { $in: toWrite.map(({ creator }) => creator._id) }, role: CONTENT_CREATOR_ROLE },
      { $set: { accessAreas: target, accessUpdatedAt: new Date(), accessUpdatedBy: null } }
    );

    changes.forEach((change) => {
      logger.info(
        {
          event: 'content_creator_access_changed',
          source: 'migrateContentCreatorAccess',
          actorId: null,
          creatorId: change.id,
          before: change.before,
          after: change.after,
          added: change.after.filter((area) => !change.before.includes(area)),
          removed: change.before.filter((area) => !change.after.includes(area)),
        },
        '[access] content creator access changed'
      );
    });
  }

  return {
    mode,
    dryRun,
    areas: target,
    found: creators.length,
    updated: dryRun ? 0 : toWrite.length,
    unchanged,
    skipped,
    changes,
  };
}

/** The summary the operator reads. */
function formatReport(report) {
  const heading = {
    fill: 'Fill: creators with no saved access list get what they could already use',
    one: 'One creator: set exactly this list',
    all: 'All creators: set exactly this list',
  }[report.mode];

  const lines = [
    `${heading}${report.dryRun ? '  [DRY RUN: nothing was written]' : ''}`,
    `Areas: ${report.areas.join(', ')}`,
    `Content creators found: ${report.found}`,
    `${report.dryRun ? 'Would change' : 'Changed'}: ${report.dryRun ? report.changes.length : report.updated}`,
    `Already set this way: ${report.unchanged}`,
    `Skipped (already have their own list): ${report.skipped}`,
  ];

  if (report.changes.length > 0) {
    lines.push('', report.dryRun ? 'Would change:' : 'Changed:');
    report.changes.forEach((change) => {
      lines.push(`  ${change.email}: ${change.before.join(', ') || '(none)'}  ->  ${change.after.join(', ')}`);
    });
  }

  return lines.join('\n');
}

/** CLI entry point: owns the database connection lifecycle around the pure migration above. */
async function main(argv = process.argv.slice(2)) {
  // Read the command line first: a typo must stop the run before any connection is opened.
  const options = parseArgs(argv);

  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids');
  logger.info({ host: conn.connection.host }, '[ContentCreatorAccess] Connected');

  try {
    const report = await migrateContentCreatorAccess(options);
    // eslint-disable-next-line no-console
    console.log(formatReport(report));
    return report;
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      if (error instanceof UsageError) {
        // eslint-disable-next-line no-console
        console.error(`${error.message}\n\n${USAGE}`);
      } else {
        logger.error({ err: error }, '[ContentCreatorAccess] Failed');
      }
      process.exit(1);
    });
}

module.exports = { migrateContentCreatorAccess, parseArgs, formatReport, main, UsageError, USAGE };
