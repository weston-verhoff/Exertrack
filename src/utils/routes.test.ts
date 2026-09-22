import { getLegacyRunnerRedirect } from './routes';

describe('legacy workout runner routes', () => {
  it('preserves the workout ID when redirecting to Workout Details', () => {
    expect(getLegacyRunnerRedirect('workout-1')).toBe('/workout/workout-1');
  });

  it('redirects a bare runner route to the dashboard', () => {
    expect(getLegacyRunnerRedirect()).toBe('/');
  });
});
