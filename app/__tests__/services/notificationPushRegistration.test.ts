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
    };
    devicePushTokenService.register.mockResolvedValue({ success: true });

    const result = await registerDeviceForPushNotifications({
      notifications,
      platform: 'ios',
      registerToken: devicePushTokenService.register,
    });

    expect(result).toEqual({ registered: true });
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(devicePushTokenService.register).toHaveBeenCalledWith({
      platform: 'ios',
      token: 'ExponentPushToken[parent-ios]',
    });
  });

  it('does not re-prompt after denial', async () => {
    storage.getItem.mockResolvedValue('1');
    const notifications = {
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied', granted: false, canAskAgain: true }),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn(),
    };

    const result = await registerDeviceForPushNotifications({
      notifications,
      platform: 'android',
      registerToken: devicePushTokenService.register,
    });

    expect(result.registered).toBe(false);
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(devicePushTokenService.register).not.toHaveBeenCalled();
  });
});
