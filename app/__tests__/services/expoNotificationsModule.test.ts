import { loadExpoNotificationsModule } from '@/services/expoNotificationsModule';

describe('expoNotificationsModule', () => {
  it('does not import expo-notifications on Android Expo Go', async () => {
    const importModule = jest.fn();

    const result = await loadExpoNotificationsModule({
      platform: 'android',
      clientKind: 'expo-go',
      importModule,
    });

    expect(result).toBeNull();
    expect(importModule).not.toHaveBeenCalled();
  });

  it('loads the module in a standalone Android build', async () => {
    const module = { getExpoPushTokenAsync: jest.fn() };
    const importModule = jest.fn().mockResolvedValue(module);

    const result = await loadExpoNotificationsModule({
      platform: 'android',
      clientKind: 'standalone',
      importModule,
    });

    expect(result).toBe(module);
    expect(importModule).toHaveBeenCalledTimes(1);
  });

  it('still loads the module in iOS Expo Go', async () => {
    const importModule = jest.fn().mockResolvedValue({});

    await loadExpoNotificationsModule({
      platform: 'ios',
      clientKind: 'expo-go',
      importModule,
    });

    expect(importModule).toHaveBeenCalledTimes(1);
  });
});
