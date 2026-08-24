import { getDeviceTimeZone } from '@/utils/deviceTimeZone';

describe('deviceTimeZone', () => {
  it('reads the IANA zone from the device and does not use language', () => {
    expect(getDeviceTimeZone(() => ({ timeZone: 'Europe/Madrid', locale: 'pt-BR' }))).toBe(
      'Europe/Madrid'
    );
    expect(getDeviceTimeZone(() => ({ timeZone: '' }))).toBeNull();
  });
});
