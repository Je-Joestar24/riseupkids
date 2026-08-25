const { formatExpoRequestError, sendExpoPushMessages } = require('../services/notificationPush.client');

describe('Expo push client errors', () => {
  it('replaces axios 400 text with the Expo error code', () => {
    const wrapped = formatExpoRequestError({
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          errors: [
            {
              code: 'PUSH_TOO_MANY_EXPERIENCE_IDS',
              message: 'All push notification messages in the same request must be for a single project',
            },
          ],
        },
      },
    });

    expect(wrapped.message).toBe(
      'PUSH_TOO_MANY_EXPERIENCE_IDS: All push notification messages in the same request must be for a single project'
    );
    expect(wrapped.statusCode).toBe(400);
  });

  it('throws mixed-experience body errors so the sender can retry per token', async () => {
    await expect(
      sendExpoPushMessages(
        [{ to: 'ExponentPushToken[a]', title: 'Hi', body: 'There' }],
        {
          request: async () => ({
            errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS', message: 'mixed experiences' }],
          }),
        }
      )
    ).rejects.toThrow(/PUSH_TOO_MANY_EXPERIENCE_IDS/);
  });
});
