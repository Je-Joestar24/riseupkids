import AsyncStorage from '@react-native-async-storage/async-storage';

import { registerDeviceForPushNotifications } from '@/services/notificationPushRegistration';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@/services/devicePushTokenService', () => ({
  devicePushTokenService: {
    register: jest.fn(),
    unregister: jest.fn(),
  },
}));

const { devicePushTokenService } = jest.requireMock('@/services/devicePushTokenService') as {
  devicePushTokenService: { register: jest.Mock };
};

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('notificationPushRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue(undefined);
  });

  it('registers an Expo token on the parent account after a one-time permission grant', async () => {
    const notifications = {
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined', granted: false, canAskAgain: true }),
      requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true }),
      getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[parent-ios]' }),
      setNotificationHandler: jest.fn(),
    };
    devicePushTokenService.register.mockResolvedValue({ success: true });

    const result = await registerDeviceForPushNotifications({
      notifications,
      platform: 'ios',
      registerToken: devicePushTokenService.register,
    });

    expect(result).toEqual({ registered: true });
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(devicePushTokenService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'ios',
        token: 'ExponentPushToken[parent-ios]',
        clientKind: expect.any(String),
      })
    );
  });

  it('does not re-prompt after denial', async () => {
    storage.getItem.mockResolvedValue('1');
    const notifications = {
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied', granted: false, canAskAgain: true }),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn(),
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
    };

    const result = await registerDeviceForPushNotifications({
      notifications,
      platform: 'android',
      clientKind: 'standalone',
      registerToken: devicePushTokenService.register,
    });

    expect(result.registered).toBe(false);
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(devicePushTokenService.register).not.toHaveBeenCalled();
  });

  it('returns a reason instead of throwing when Expo cannot mint a token', async () => {
    const notifications = {
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true }),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn().mockRejectedValue(new Error('FCM is not configured')),
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
    };

    const result = await registerDeviceForPushNotifications({
      notifications,
      platform: 'android',
      clientKind: 'standalone',
      registerToken: devicePushTokenService.register,
    });

    expect(result.registered).toBe(false);
    expect(result.reason).toContain('FCM is not configured');
    expect(devicePushTokenService.register).not.toHaveBeenCalled();
  });

  it('skips Android Expo Go instead of calling the removed remote-push API', async () => {
    const notifications = {
      getPermissionsAsync: jest.fn(),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn(),
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
    };

    const result = await registerDeviceForPushNotifications({
      notifications,
      platform: 'android',
      clientKind: 'expo-go',
      registerToken: devicePushTokenService.register,
    });

    expect(result.registered).toBe(false);
    expect(result.reason).toMatch(/expo_go_android_no_remote_push/);
    expect(notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(devicePushTokenService.register).not.toHaveBeenCalled();
  });
});
