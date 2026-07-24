import {
  parseBookCompletionStarPayload,
  runBackgroundAfterStarReward,
} from '@/utils/bookCompletionStarReward';

describe('parseBookCompletionStarPayload', () => {
  it('parses a normal completion payload', () => {
    expect(
      parseBookCompletionStarPayload({
        starsToAward: 10,
        totalStars: 120,
        starsAwarded: true,
        readingCount: 2,
        requiredReadingCount: 5,
        requirementMet: false,
      })
    ).toEqual({
      starsToAward: 10,
      totalStars: 120,
      starsAwarded: true,
      readingCount: 2,
      requiredReadingCount: 5,
      requirementMet: false,
    });
  });

  it('defaults safely for missing or invalid values', () => {
    expect(parseBookCompletionStarPayload(null)).toEqual({
      starsToAward: 0,
      totalStars: undefined,
      starsAwarded: false,
      readingCount: 0,
      requiredReadingCount: 5,
      requirementMet: false,
    });

    expect(
      parseBookCompletionStarPayload({
        starsToAward: 'nope',
        totalStars: null,
      })
    ).toEqual({
      starsToAward: 0,
      totalStars: undefined,
      starsAwarded: false,
      readingCount: 0,
      requiredReadingCount: 5,
      requirementMet: false,
    });
  });
});

describe('runBackgroundAfterStarReward', () => {
  it('does not block the caller on a slow task', async () => {
    let resolveTask: () => void = () => {};
    const slow = new Promise<void>((resolve) => {
      resolveTask = resolve;
    });

    const order: string[] = [];
    runBackgroundAfterStarReward(async () => {
      await slow;
      order.push('background');
    });

    order.push('caller');
    expect(order).toEqual(['caller']);

    resolveTask();
    await slow;
    await Promise.resolve();
    expect(order).toEqual(['caller', 'background']);
  });

  it('swallows background errors without throwing to the caller', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      runBackgroundAfterStarReward(async () => {
        throw new Error('refresh failed');
      }, 'test');
    }).not.toThrow();

    await new Promise((resolve) => setImmediate(resolve));
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
