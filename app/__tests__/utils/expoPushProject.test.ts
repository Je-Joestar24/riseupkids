import { getExpoProjectId, getPushClientKind } from '@/utils/expoPushProject';

describe('expoPushProject', () => {
  it('prefers EAS config project id for standalone preview tokens', () => {
    expect(
      getExpoProjectId({
        easConfig: { projectId: 'from-eas' },
        expoConfig: { extra: { eas: { projectId: 'from-extra' } } },
      })
    ).toBe('from-eas');
  });

  it('marks Expo Go separately from a preview/store build', () => {
    expect(getPushClientKind({ appOwnership: 'expo' })).toBe('expo-go');
    expect(getPushClientKind({ appOwnership: 'standalone' })).toBe('standalone');
  });
});
