import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FaArrowUp, FaPen, FaSearch } from 'react-icons/fa';
import { Drawer } from '../components/Drawer';
import { ResponsiveSegmentedControl } from '../components/ResponsiveSegmentedControl';
import { WorkoutCard } from '../components/WorkoutCard';
import { SwitchField } from '../components/SwitchField';
import { useAuth } from '../context/AuthContext';
import {
  AccountSettings,
  CustomExercise,
  fetchCustomExercises,
  getAccountSettings,
  updateAccountSettings,
  updateCustomExercise,
  Weekday,
} from '../services/accountService';
import {
  fetchAnalyticsWorkouts,
  fetchWorkoutOverview,
  WorkoutDetailSummary,
} from '../services/workoutService';
import { confirmAndDeleteWorkout } from '../utils/workoutActions';
import {
  getStrengthVolume,
  getWeekStartDateKey,
  getWeeklySummary,
} from '../utils/accountMetrics';
import { applyTheme } from '../utils/theme';
import { getDistanceUnitOptions, normalizeDistanceUnit } from '../utils/unitPreferences';
import { DistanceUnit } from '../types/workout';
import { useSystemAlerts } from '../context/SystemAlertContext';
import '../styles/account.css';

const ArrowUpIcon = FaArrowUp as unknown as React.FC<{ 'aria-hidden'?: boolean }>;
const PenIcon = FaPen as unknown as React.FC<{ 'aria-hidden'?: boolean }>;
const SearchIcon = FaSearch as unknown as React.FC<{ 'aria-hidden'?: boolean }>;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WEEKDAYS: Array<{ value: Weekday; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const DISTANCE_OPTIONS: Array<{
  value: AccountSettings['distanceSystem'];
  label: string;
}> = [
  { value: 'imperial', label: 'Miles, Yards, Feet' },
  { value: 'metric', label: 'Kilometers, Meters, Centimeters' },
];

const WEIGHT_OPTIONS: Array<{
  value: AccountSettings['weightSystem'];
  label: string;
}> = [
  { value: 'imperial', label: 'Pounds (lbs) & Ounces (oz)' },
  { value: 'metric', label: 'Kilograms (kg) & Grams (g)' },
];

const THEME_OPTIONS: Array<{
  value: AccountSettings['theme'];
  label: string;
}> = [
  { value: 'default', label: 'Up & Up' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'neon', label: 'Neon' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'sunset', label: 'Sunset' },
];

const SECTION_LINKS = [
  { href: '#recent-workouts', label: 'Recent Workouts' },
  { href: '#training-analytics', label: 'Analytics' },
  { href: '#custom-exercises', label: 'Custom Exercises' },
  { href: '#account-settings', label: 'Account Settings' },
];

export default function AccountPage() {
  const { user, userId, loading: authLoading, signOut } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutDetailSummary[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExercise, setEditingExercise] = useState<CustomExercise | null>(null);
  const [exerciseDrawerOpen, setExerciseDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [exerciseStatus, setExerciseStatus] = useState<string | null>(null);
  const { dismissAlertGroup, showAlert } = useSystemAlerts();

  useEffect(() => {
    if (pageError) showAlert(pageError, { tone: 'error' });
  }, [pageError, showAlert]);

  useEffect(() => {
    if (!settingsStatus) return;
    const isSaving = /saving/i.test(settingsStatus);
    const isSaved = /saved/i.test(settingsStatus);
    if (!isSaving && !isSaved) {
      dismissAlertGroup('account-settings-save');
      showAlert(settingsStatus, { tone: 'error' });
      return;
    }
    showAlert(settingsStatus, {
      tone: isSaved ? 'success' : 'info',
      replaceKey: 'account-settings-save',
    });
  }, [dismissAlertGroup, settingsStatus, showAlert]);

  useEffect(() => {
    if (!exerciseStatus) return;
    const isSaving = /saving/i.test(exerciseStatus);
    const isUpdated = /updated/i.test(exerciseStatus);
    if (!isSaving && !isUpdated) {
      dismissAlertGroup('exercise-save');
      showAlert(exerciseStatus, { tone: 'error' });
      return;
    }
    showAlert(exerciseStatus, {
      tone: isUpdated ? 'success' : 'info',
      replaceKey: 'exercise-save',
    });
  }, [dismissAlertGroup, exerciseStatus, showAlert]);

  const loadAccountData = useCallback(async (currentUserId: string) => {
    setLoading(true);
    setPageError(null);

    const [analyticsResult, overviewResult, exercisesResult] = await Promise.all([
      fetchAnalyticsWorkouts({ userId: currentUserId }),
      fetchWorkoutOverview({ userId: currentUserId, limitCompleted: 2 }),
      fetchCustomExercises({ userId: currentUserId }),
    ]);

    const error = analyticsResult.error ?? overviewResult.error ?? exercisesResult.error;
    if (error) setPageError(error);

    setWorkouts(analyticsResult.data ?? []);
    setRecentWorkouts(overviewResult.data?.completed ?? []);
    setCustomExercises(exercisesResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) setSettings(getAccountSettings(user));
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    loadAccountData(userId);
  }, [authLoading, loadAccountData, userId]);

  const weekStart = getWeekStartDateKey(settings?.startOfWeek ?? 1);
  const weeklySummary = getWeeklySummary(workouts, weekStart);

  const muscleGroups = useMemo(
    () =>
      Array.from(
        new Set(
          workouts.flatMap(workout =>
            workout.workout_exercises
              .filter(exercise => exercise.exercise.exercise_type === 'strength')
              .map(exercise => exercise.exercise.target_muscle)
          )
        )
      ).sort(),
    [workouts]
  );

  const chartData = useMemo(() => {
    // Re-read semantic chart colors whenever the selected theme changes.
    void settings?.theme;
    const volumeByDate = new Map<string, number>();
    workouts.forEach(workout => {
      const volume = workout.workout_exercises.reduce((total, exercise) => {
        if (
          selectedMuscle !== 'all' &&
          exercise.exercise.target_muscle !== selectedMuscle
        ) {
          return total;
        }
        return total + getStrengthVolume(exercise);
      }, 0);
      volumeByDate.set(workout.date, (volumeByDate.get(workout.date) ?? 0) + volume);
    });

    const entries = Array.from(volumeByDate.entries()).sort(([a], [b]) => a.localeCompare(b));
    const styles = getComputedStyle(document.documentElement);
    const lineColor = styles.getPropertyValue('--color-chart-series-1').trim();
    const fillColor = styles.getPropertyValue('--color-chart-series-1-fill').trim();

    return {
      labels: entries.map(([date]) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
          new Date(`${date}T00:00:00`)
        )
      ),
      datasets: [
        {
          label: selectedMuscle === 'all' ? 'Total Volume' : `${selectedMuscle} Volume`,
          data: entries.map(([, volume]) => volume),
          borderColor: lineColor,
          backgroundColor: fillColor,
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [selectedMuscle, settings?.theme, workouts]);

  const filteredExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return customExercises;
    return customExercises.filter(
      exercise =>
        exercise.name.toLowerCase().includes(query) ||
        exercise.target_muscle.toLowerCase().includes(query)
    );
  }, [customExercises, searchQuery]);

  const saveSettings = async (nextSettings: AccountSettings) => {
    if (!user) return;
    setSettings(nextSettings);
    setSettingsStatus('Saving...');
    const { error } = await updateAccountSettings({
      settings: nextSettings,
      currentMetadata: user.user_metadata ?? {},
    });
    if (error) {
      setSettingsStatus(error);
      return;
    }
    applyTheme(nextSettings.theme);
    setSettings({ ...nextSettings });
    setSettingsStatus('Settings saved.');
  };

  const updateSetting = <K extends keyof AccountSettings>(
    key: K,
    value: AccountSettings[K]
  ) => {
    if (!settings) return;
    saveSettings({ ...settings, [key]: value });
  };

  const handleExerciseSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingExercise || !userId || !settings) return;
    if (!editingExercise.name.trim() || !editingExercise.target_muscle.trim()) {
      setExerciseStatus('Name and target muscle are required.');
      return;
    }

    const normalizedExercise = {
      ...editingExercise,
      default_distance_unit:
        editingExercise.exercise_type === 'cardio'
          ? normalizeDistanceUnit(editingExercise.default_distance_unit, settings.distanceSystem)
          : null,
      track_laps:
        editingExercise.exercise_type === 'cardio' && editingExercise.track_laps,
    };

    setExerciseStatus('Saving...');
    const { data, error } = await updateCustomExercise({
      exercise: normalizedExercise,
      userId,
    });
    if (error || !data) {
      setExerciseStatus(error ?? 'Failed to update custom exercise.');
      return;
    }

    setCustomExercises(current =>
      current
        .map(exercise => (exercise.id === data.id ? data : exercise))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingExercise(data);
    setExerciseDrawerOpen(false);
    setExerciseStatus('Exercise updated.');
  };

  const openExerciseDrawer = (exercise: CustomExercise) => {
    const distanceSystem = settings?.distanceSystem ?? 'imperial';
    setEditingExercise({
      ...exercise,
      default_distance_unit:
        exercise.exercise_type === 'cardio'
          ? normalizeDistanceUnit(exercise.default_distance_unit, distanceSystem)
          : null,
    });
    setExerciseStatus(null);
    setExerciseDrawerOpen(true);
  };

  const closeExerciseDrawer = () => {
    setExerciseDrawerOpen(false);
    setExerciseStatus(null);
  };

  const deleteRecentWorkout = async (workoutId: string) => {
    if (!userId) return;
    const { deleted, error } = await confirmAndDeleteWorkout({
      workoutId,
      userId,
      confirmationMessage: 'Delete this workout permanently?',
    });
    if (error) {
      setPageError(error);
      return;
    }
    if (deleted) {
      setRecentWorkouts(current => current.filter(workout => workout.id !== workoutId));
      setWorkouts(current => current.filter(workout => workout.id !== workoutId));
    }
  };

  if (!settings) return <p className="account-loading">Loading account...</p>;

  const firstName = settings.firstName.trim();

  return (
    <div id="account-top" className="account-page">
      <section className="account-hero" aria-labelledby="account-greeting">
        <h1 id="account-greeting">{firstName ? `Hello, ${firstName}!` : 'Hello!'}</h1>
        <div className="account-stat-grid" aria-label="Workout summary">
          <article className="account-stat-card" data-tone="workout">
            <span>Lifetime Workouts</span>
            <strong>{workouts.length}</strong>
          </article>
          <article className="account-stat-card" data-tone="workout">
            <span>Sets This Week</span>
            <strong>{weeklySummary.strengthSets}</strong>
          </article>
          <article className="account-stat-card" data-tone="workout">
            <span>Workouts This Week</span>
            <strong>{weeklySummary.workouts.length}</strong>
          </article>
          <article className="account-stat-card" data-tone="workout">
            <span>Cardio Minutes This Week</span>
            <strong>{weeklySummary.cardioMinutes}</strong>
          </article>
        </div>
      </section>

      <div className="account-shell">
        <aside className="account-sidebar color-context color-context--raised" aria-label="Account page navigation">
          <nav>
            {SECTION_LINKS.map(link => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </nav>
          <div className="account-sidebar__actions">
            <a className="account-sidebar__top" href="#account-top">
              <ArrowUpIcon aria-hidden={true} /> Back to top
            </a>
            <button type="button" onClick={signOut}>Sign Out</button>
          </div>
        </aside>

        <main className="account-content">
          <section id="recent-workouts" className="account-section">
            <h2>Recent Workouts</h2>
            {loading ? (
              <p>Loading workouts...</p>
            ) : recentWorkouts.length ? (
              <div className="account-recent-grid">
                {recentWorkouts.map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    tone="workout"
                    variant="past-workout"
                    onDelete={deleteRecentWorkout}
                    onStatusChange={(id, status) =>
                      setRecentWorkouts(current =>
                        current.map(item => (item.id === id ? { ...item, status } : item))
                      )
                    }
                    onWorkoutUpdated={updated =>
                      setRecentWorkouts(current =>
                        current.map(item => (item.id === updated.id ? updated : item))
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <p>No completed workouts yet.</p>
            )}
          </section>

          <section id="training-analytics" className="account-section">
            <div className="account-section__heading">
              <h2>Analytics</h2>
              <label>
                <span>Muscle group</span>
                <select value={selectedMuscle} onChange={event => setSelectedMuscle(event.target.value)}>
                  <option value="all">All muscles</option>
                  {muscleGroups.map(muscle => <option key={muscle} value={muscle}>{muscle}</option>)}
                </select>
              </label>
            </div>
            <div className="account-chart color-context color-context--raised" data-tone="workout" aria-label="Strength volume chart">
              {workouts.length ? (
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              ) : (
                <p>No completed workout data yet.</p>
              )}
            </div>
          </section>

          <section id="custom-exercises" className="account-section">
            <h2>Custom Exercises</h2>
            <label className="account-search" data-tone="library">
              <SearchIcon aria-hidden={true} />
              <span className="sr-only">Search custom exercises</span>
              <input
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search by exercise or muscle group"
              />
            </label>

            <div className="exercise-chip-list">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  className="exercise-chip"
                  data-tone="library"
                  onClick={() => openExerciseDrawer(exercise)}
                >
                  <span className="exercise-chip__icon"><PenIcon aria-hidden={true} /></span>
                  <span>
                    <strong>{exercise.name}</strong>
                    <small>{exercise.target_muscle}</small>
                  </span>
                </button>
              ))}
            </div>
            {!loading && filteredExercises.length === 0 && (
              <p>{searchQuery ? 'No custom exercises match your search.' : 'No custom exercises yet.'}</p>
            )}
          </section>

          <section id="account-settings" className="account-section account-settings">
            <h2>Account Settings</h2>
            <div className="account-name-grid">
              <label>
                <span>First Name</span>
                <input
                  value={settings.firstName}
                  onChange={event => setSettings({ ...settings, firstName: event.target.value })}
                  onBlur={() => saveSettings(settings)}
                />
              </label>
              <label>
                <span>Last Name</span>
                <input
                  value={settings.lastName}
                  onChange={event => setSettings({ ...settings, lastName: event.target.value })}
                  onBlur={() => saveSettings(settings)}
                />
              </label>
            </div>

            <fieldset data-tone="selection">
              <legend>Start of Week</legend>
              <ResponsiveSegmentedControl
                options={WEEKDAYS}
                value={settings.startOfWeek}
                onChange={value => updateSetting('startOfWeek', value)}
              />
            </fieldset>

            <fieldset data-tone="selection">
              <legend>Preferred Distance</legend>
              <ResponsiveSegmentedControl
                options={DISTANCE_OPTIONS}
                value={settings.distanceSystem}
                onChange={value => updateSetting('distanceSystem', value)}
              />
            </fieldset>

            <fieldset data-tone="selection">
              <legend>Preferred Weights</legend>
              <ResponsiveSegmentedControl
                options={WEIGHT_OPTIONS}
                value={settings.weightSystem}
                onChange={value => updateSetting('weightSystem', value)}
              />
            </fieldset>

            <fieldset data-tone="selection">
              <legend>Color Theme</legend>
              <ResponsiveSegmentedControl
                options={THEME_OPTIONS}
                value={settings.theme}
                onChange={value => updateSetting('theme', value)}
              />
            </fieldset>
          </section>
        </main>
      </div>

      {editingExercise && (
        <Drawer
          isOpen={exerciseDrawerOpen}
          onClose={closeExerciseDrawer}
          width={440}
          tone="library"
        >
          <form className="exercise-editor exercise-editor--drawer" data-tone="library" onSubmit={handleExerciseSave}>
            <div className="exercise-editor__header">
              <h2>Edit custom exercise</h2>
              <p>Update how this exercise appears throughout your workouts.</p>
            </div>
            <label>
              <span>Name</span>
              <input
                value={editingExercise.name}
                onChange={event => setEditingExercise({ ...editingExercise, name: event.target.value })}
              />
            </label>
            <label>
              <span>Target muscle</span>
              <input
                value={editingExercise.target_muscle}
                onChange={event => setEditingExercise({ ...editingExercise, target_muscle: event.target.value })}
              />
            </label>
            <label>
              <span>Exercise type</span>
              <select
                value={editingExercise.exercise_type}
                onChange={event =>
                  setEditingExercise({
                    ...editingExercise,
                    exercise_type: event.target.value as 'strength' | 'cardio',
                    default_distance_unit:
                      event.target.value === 'cardio'
                        ? normalizeDistanceUnit(
                            editingExercise.default_distance_unit,
                            settings.distanceSystem
                          )
                        : null,
                    track_laps:
                      event.target.value === 'cardio' && editingExercise.track_laps,
                  })
                }
              >
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
              </select>
            </label>
            {editingExercise.exercise_type === 'cardio' && (
              <>
                <label>
                  <span>Default distance unit</span>
                  <select
                    value={normalizeDistanceUnit(
                      editingExercise.default_distance_unit,
                      settings.distanceSystem
                    )}
                    onChange={event =>
                      setEditingExercise({
                        ...editingExercise,
                        default_distance_unit: event.target.value as DistanceUnit,
                      })
                    }
                  >
                    {getDistanceUnitOptions(settings.distanceSystem).map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <SwitchField
                  checked={editingExercise.track_laps}
                  label="Track laps"
                  onChange={trackLaps =>
                    setEditingExercise({
                      ...editingExercise,
                      track_laps: trackLaps,
                    })
                  }
                />
              </>
            )}
            <div className="exercise-editor__actions">
              <button type="submit">Save Exercise</button>
              <button type="button" className="secondary" onClick={closeExerciseDrawer}>Cancel</button>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}
