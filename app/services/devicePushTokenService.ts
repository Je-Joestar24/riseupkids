import { api } from './api';

export interface DevicePushTokenPayload {
  platform: 'ios' | 'android';
  token: string;
}

export const devicePushTokenService = {
  register: (payload: DevicePushTokenPayload) =>
    api.post('/notifications/device-tokens', payload),

  unregister: (token: string) =>
    api.delete('/notifications/device-tokens', { data: { token } }),
};
