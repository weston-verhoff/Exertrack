import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { ResponsiveSegmentedControl } from '../components/ResponsiveSegmentedControl';
import { WorkoutButton } from '../components/WorkoutButton';
import { useAuth } from '../context/AuthContext';
import {
  AccountSettings,
  getAccountSettings,
  updateAccountSettings,
  Weekday,
} from '../services/accountService';
import { supabase } from '../supabase/client';
import { AppTheme, applyTheme } from '../utils/theme';
import '../styles/onboarding.css';

const THEMES: Array<{ value: AppTheme; label: string }> = [
  { value: 'default', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'up-and-up', label: 'Up & Up' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'neon', label: 'Neon' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'sunset', label: 'Sunset' },
];

const WEEKDAYS: Array<{ value: Weekday; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export default function Onboarding() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [settings, setSettings] = useState<AccountSettings | null>(() =>
    user ? getAccountSettings(user) : null
  );
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.onboarding_completed === true) {
      navigate('/', { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => {
    if (!settings && user) setSettings(getAccountSettings(user));
  }, [settings, user]);

  if (!user || !settings) return <div className="onboarding-page" />;

  const update = <K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) => {
    setSettings(current => current ? { ...current, [key]: value } : current);
    if (key === 'theme') applyTheme(value as AppTheme, { animate: true });
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const completedSettings = { ...settings, onboardingCompleted: true };
    const result = await updateAccountSettings({
      settings: completedSettings,
      currentMetadata: user.user_metadata ?? {},
    });

    if (result.error) {
      setSaving(false);
      setError(result.error);
      return;
    }

    await supabase.auth.refreshSession();
    navigate('/', { replace: true });
  };

  const returnToSignIn = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setError(null);

    try {
      await signOut();
      navigate('/login', { replace: true, state: null });
    } catch (signOutError) {
      console.error('Error returning to sign in', signOutError);
      setError('Unable to sign out. Please try again.');
      setSigningOut(false);
    }
  };

  return (
    <div className="onboarding-page color-context color-context--canvas">
      <section className="onboarding-card color-context color-context--raised" aria-labelledby="onboarding-title">
        {step === 1 ? (
          <>
            <header className="onboarding-header">
              <p>Step 1 of 2</p>
              <h1 id="onboarding-title">Welcome!</h1>
              <span>Set up a few preferences before getting started. You can change them later in Account.</span>
            </header>

            <div className="onboarding-name-grid">
              <label>
                <span>First name <small>(optional)</small></span>
                <input value={settings.firstName} onChange={event => update('firstName', event.target.value)} placeholder="Jimmy" />
              </label>
              <label>
                <span>Last name <small>(optional)</small></span>
                <input value={settings.lastName} onChange={event => update('lastName', event.target.value)} placeholder="Neutron" />
              </label>
            </div>

            <fieldset className="onboarding-themes">
              <legend>Choose your theme</legend>
              <div className="onboarding-theme-grid">
                {THEMES.map(theme => (
                  <button
                    aria-pressed={settings.theme === theme.value}
                    className="onboarding-theme-card"
                    key={theme.value}
                    onClick={() => update('theme', theme.value)}
                    type="button"
                  >
                    <span className={`onboarding-theme-preview onboarding-theme-preview--${theme.value}`} />
                    <span>{theme.label}</span>
                    {settings.theme === theme.value && <Check aria-hidden="true" size={16} />}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="onboarding-actions">
              <WorkoutButton label="Skip" variant="secondary" onClick={() => void finish()} disabled={saving} />
              <WorkoutButton label="Continue" onClick={() => setStep(2)} />
            </div>
          </>
        ) : (
          <>
            <header className="onboarding-header">
              <p>Step 2 of 2</p>
              <h1 id="onboarding-title">Units and calendar</h1>
              <span>Choose the defaults that match how you train.</span>
            </header>

            <div className="onboarding-preferences">
              <fieldset>
                <legend>Default weight units</legend>
                <ResponsiveSegmentedControl
                  options={[{ value: 'imperial', label: 'Pounds & Ounces' }, { value: 'metric', label: 'Kilograms & Grams' }] as const}
                  value={settings.weightSystem}
                  onChange={value => update('weightSystem', value)}
                />
              </fieldset>
              <fieldset>
                <legend>Default distance units</legend>
                <ResponsiveSegmentedControl
                  options={[{ value: 'imperial', label: 'Miles, Yards, & Feet' }, { value: 'metric', label: 'Kilometers & Meters' }] as const}
                  value={settings.distanceSystem}
                  onChange={value => update('distanceSystem', value)}
                />
              </fieldset>
              <fieldset>
                <legend>Week start</legend>
                <ResponsiveSegmentedControl options={WEEKDAYS} value={settings.startOfWeek} onChange={value => update('startOfWeek', value)} />
              </fieldset>
            </div>

            <div className="onboarding-actions onboarding-actions--three">
              <WorkoutButton label="Back" icon={<ArrowLeft size={18} />} variant="secondary" onClick={() => setStep(1)} disabled={saving} />
              <WorkoutButton label="Skip" variant="secondary" onClick={() => void finish()} disabled={saving} />
              <WorkoutButton label="Start My Journey" loading={saving} loadingLabel="Saving..." onClick={() => void finish()} />
            </div>
          </>
        )}
        {error && <p className="onboarding-error" role="alert">{error}</p>}
        <div className="onboarding-sign-in">
          <WorkoutButton
            label="Back to Sign In"
            icon={<ArrowLeft size={18} />}
            variant="quiet"
            loading={signingOut}
            loadingLabel="Signing Out..."
            onClick={() => void returnToSignIn()}
            disabled={saving}
          />
        </div>
      </section>
    </div>
  );
}
