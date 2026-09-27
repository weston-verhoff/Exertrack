import { getAccountSettings } from './accountService';

describe('account onboarding settings', () => {
  it('treats missing onboarding metadata as incomplete', () => {
    const settings = getAccountSettings({ user_metadata: {} } as any);
    expect(settings.onboardingCompleted).toBe(false);
  });

  it('recognizes completed onboarding metadata', () => {
    const settings = getAccountSettings({
      user_metadata: { onboarding_completed: true },
    } as any);
    expect(settings.onboardingCompleted).toBe(true);
  });
});
