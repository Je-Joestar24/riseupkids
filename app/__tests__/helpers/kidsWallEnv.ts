/**
 * Test helper: runs every test in the calling file with the Kids Wall platform flags unset, and puts
 * the original values back afterwards. Call it once at the top of a test file, then set a flag inside
 * a test where that test needs it.
 */
const FLAGS = ['EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW', 'EXPO_PUBLIC_KIDS_WALL_COMING_SOON'] as const;

export function withCleanKidsWallEnv(): void {
  const original = Object.fromEntries(FLAGS.map((flag) => [flag, process.env[flag]]));

  beforeEach(() => {
    FLAGS.forEach((flag) => {
      delete process.env[flag];
    });
  });

  afterEach(() => {
    FLAGS.forEach((flag) => {
      if (original[flag] === undefined) delete process.env[flag];
      else process.env[flag] = original[flag];
    });
  });
}
