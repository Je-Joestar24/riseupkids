import { reportDeviceTimezone } from '@/services/deviceTimezoneReport';

describe('deviceTimezoneReport', () => {
  it('reports the device IANA timezone to the parent account', async () => {
    const reportTimezone = jest.fn().mockResolvedValue({ success: true });
    const result = await reportDeviceTimezone({
      getTimeZone: () => 'Europe/Madrid',
      reportTimezone,
    });

    expect(result).toEqual({ reported: true, timezone: 'Europe/Madrid' });
    expect(reportTimezone).toHaveBeenCalledWith('Europe/Madrid');
  });
});
