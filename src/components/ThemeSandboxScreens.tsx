import { themeChartPlugin } from '../utils/themeChartPlugin';
import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { WorkoutCard } from './WorkoutCard';
import { TemplateCard } from './TemplateCard';
import { WorkoutButton } from './WorkoutButton';
import { WorkoutDetails } from './WorkoutDetails';
import { Workout } from '../types/workout';
import { AppTheme } from '../utils/theme';
import '../styles/plan.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const workout: Workout = {
  id: 'sandbox-workout', date: '2026-10-06', status: 'planned',
  workout_exercises: [
    { id: 'sandbox-strength', exercise_id: 'sandbox-bench', order: 0,
      exercise: { id: 'sandbox-bench', name: 'Bench press with a long descriptive exercise name', target_muscle: 'Chest', exercise_type: 'strength' },
      workout_sets: [1, 2, 3].map(set_number => ({ set_number, reps: 8, weight: 135, intensity_type: set_number === 3 ? 'drop' : 'normal' })) },
    { id: 'sandbox-cardio', exercise_id: 'sandbox-run', order: 1,
      exercise: { id: 'sandbox-run', name: 'Treadmill intervals', target_muscle: 'Cardio', exercise_type: 'cardio' },
      workout_sets: [1, 2].map(set_number => ({ set_number, duration_seconds: 600, distance_value: 1, distance_unit: 'mi' })) },
  ],
};

export function SandboxWorkoutEditor({ fullPage = false, onAction }: { fullPage?: boolean; onAction: () => void }) {
  const [exercises, setExercises] = useState(workout.workout_exercises);
  const [date, setDate] = useState(workout.date);
  const [status, setStatus] = useState('scheduled');
  return <div onClickCapture={event => {
    // Production editor buttons include backend mutations. Inspect their styling,
    // but intercept actions before their handlers; numeric/date edits remain local.
    if ((event.target as Element).closest('button')) { event.stopPropagation(); onAction(); }
  }}>
    <p>Production workout editor. Fields edit sample state; button actions are intercepted.</p>
    <WorkoutDetails workoutId={workout.id} date={date} status={status} exercises={exercises}
      onDateChange={setDate} onStatusChange={setStatus} onExercisesChange={setExercises}
      onSave={async () => { onAction(); return true; }} onDelete={onAction} fullPage={fullPage} />
  </div>;
}

function AnalyticsPreview({ theme, paletteRevision }: { theme: AppTheme; paletteRevision: string }) {
  const [colors, setColors] = useState<string[]>([]);
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setColors([1, 2, 3].flatMap(series => [styles.getPropertyValue(`--color-chart-series-${series}`).trim(), styles.getPropertyValue(`--color-chart-series-${series}-fill`).trim()]));
  }, [theme, paletteRevision]);
  return <article className="sandbox-panel color-context color-context--raised">
    <h3>Analytics · production Chart.js renderer</h3><p>Hover or tap points to inspect the tooltip; use the legend to toggle series.</p>
    <div style={{ height: 300 }}><Line plugins={[themeChartPlugin]} data={{ labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [1, 2, 3].map((series, index) => ({ label: ['Strength sets', 'Cardio segments', 'Trend'][index], data: [3, 5, 4, 7, 6, 9, 8].map(value => value + index * 3), borderColor: colors[index * 2], backgroundColor: colors[index * 2 + 1], fill: false, borderDash: index === 2 ? [6, 4] : [], pointStyle: index === 1 ? 'triangle' : 'circle', tension: 0.3 })) }} options={{ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false } }} /></div>
  </article>;
}

export function ThemeSandboxScreens({ theme, paletteRevision = '', onAction, onDetails }: { theme: AppTheme; paletteRevision?: string; onAction: () => void; onDetails: () => void }) {
  return <section id="sandbox-screens"><h2>Production components & representative screens</h2>
    <p>Real workout and template cards with local demo actions, plus the production chart renderer. The builder below uses production layout classes with sample fields.</p>
    <div className="page-hero-surface sandbox-panel"><h3>Your week at a glance</h3><p>3 sessions planned · 24 strength sets · 40 minutes cardio</p><WorkoutButton label="Plan a session" onClick={onDetails} /></div>
    <div className="sandbox-grid">{(['future-workout', 'past-workout', 'highlighted'] as const).map(variant => <WorkoutCard key={variant} workout={workout} variant={variant} tone="workout" isNext={variant === 'future-workout'} onDelete={onAction} onStatusChange={onAction} onWorkoutUpdated={onAction} onDetails={onDetails} />)}</div>
    <div className="sandbox-grid">{(['active', 'archived'] as const).map(status => <TemplateCard key={status} status={status} tone="library" template={{ id: 'sandbox-template', name: 'Upper body & intervals', tags: [{ id: 'sandbox-tag', name: 'Long template tag for wrapping inspection' }], exercises: workout.workout_exercises.map(exercise => ({ sets: exercise.workout_sets.length, reps: 8, duration_seconds: 600, distance_value: 1, distance_unit: 'mi', order: exercise.order, exercise: exercise.exercise! })) }} availableTags={[{ id: 'sandbox-tag', name: 'Long template tag for wrapping inspection' }]} onRename={onAction} onArchive={onAction} onRestore={onAction} onDelete={onAction} onImport={onAction} onEdit={onDetails} onCreateTag={async name => ({ data: { id: `sandbox-${name}`, name }, error: null })} onSaveTags={async () => { onAction(); return null; }} />)}</div>
    <AnalyticsPreview theme={theme} paletteRevision={paletteRevision} />
    <article className="sandbox-panel color-context color-context--raised" data-tone="workout"><h3>Production workout details screen</h3><SandboxWorkoutEditor fullPage onAction={onAction} /></article>
    <form className="plan-workout-card sandbox-panel color-context" data-tone="workout" onSubmit={event => { event.preventDefault(); onAction(); }}>
      <h3>Session builder · dense nested form layout</h3>
      {workout.workout_exercises.map(exercise => <fieldset key={exercise.id}><legend>{exercise.exercise!.name}</legend>{exercise.workout_sets.map(set => <div key={set.set_number} className="builder-row"><div className="builder-row__info"><strong className="builder-row__name">Set {set.set_number}</strong><small className="builder-row__muscle">{exercise.exercise!.target_muscle}</small></div><div className="builder-row__stats">
        <label className="stat-field">{exercise.exercise!.exercise_type === 'cardio' ? 'Seconds' : 'Reps'}<input type="number" defaultValue={set.duration_seconds ?? set.reps ?? ''} /></label>
        <label className="stat-field">{exercise.exercise!.exercise_type === 'cardio' ? 'Distance' : 'Weight'}<input type="number" defaultValue={set.distance_value ?? set.weight ?? ''} /></label>
        <label className="stat-field">Intensity<select defaultValue="normal"><option>normal</option><option>drop</option><option>failure</option></select></label>
      </div></div>)}</fieldset>)}
      <WorkoutButton label="Save demo session" type="submit" />
    </form>
  </section>;
}

