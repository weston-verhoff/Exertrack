import { ExportWorkout } from '../services/workoutExportService';
import { WorkoutSet } from '../types/workout';
import { formatDuration, paceSecondsPerUnit, speedPerHour } from './cardio';

export type WorkoutExportScope = 'all' | 'past' | 'this-week' | '2-weeks' | 'planned';

const formatWorkoutDate = (dateString: string) => {
  const [yearValue, monthValue, dayValue] = dateString.split('-').map(Number);

  if (!yearValue || !monthValue || !dayValue) {
    return dateString;
  }

  const date = new Date(yearValue, monthValue - 1, dayValue);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const shortYear = String(yearValue).slice(-2);

  return `${weekday} (${monthValue}/${dayValue}/${shortYear})`;
};

const formatSetLine = (set: WorkoutSet, index: number) => {
  const setNumber = set.set_number ?? index + 1;
  const weight = Number(set.weight ?? 0);
  const reps = Number(set.reps ?? 0);

  return `Set ${setNumber}: ${weight}lbs for ${reps} reps | ${formatCompletionStatus(set)}`;
};

const formatWorkoutStatus = (status?: string) => {
  if (!status) return '';
  return `${status.charAt(0).toUpperCase()}${status.slice(1).toLowerCase()}`;
};

const formatCompletionStatus = (set: WorkoutSet) =>
  set.completed ? 'Completed' : 'Not completed';

const formatCardioLine = (set: WorkoutSet, index: number) => {
  const parts = [`Segment ${set.set_number ?? index + 1}: ${formatDuration(set.duration_seconds)}`];
  if (set.distance_value != null && set.distance_unit) parts.push(`${set.distance_value} ${set.distance_unit}`);
  if (set.calories != null) parts.push(`${set.calories} cal`);
  const pace = paceSecondsPerUnit(set.duration_seconds, set.distance_value);
  const speed = speedPerHour(set.duration_seconds, set.distance_value);
  if (pace != null && set.distance_unit) parts.push(`${formatDuration(pace)}/${set.distance_unit}`);
  if (speed != null && set.distance_unit) parts.push(`${speed.toFixed(2)} ${set.distance_unit}/h`);
  parts.push(formatCompletionStatus(set));
  return parts.join(' | ');
};

export const formatWorkoutsAsText = (workouts: ExportWorkout[]) =>
  workouts
    .map(workout => {
      const status = formatWorkoutStatus(workout.status);
      const lines = [
        `${formatWorkoutDate(workout.date)}${status ? ` (${status})` : ''}`,
      ];

      workout.workout_exercises.forEach(workoutExercise => {
        lines.push(workoutExercise.exercise?.name ?? 'Unknown Exercise');
        workoutExercise.workout_sets.forEach((set, index) => {
          lines.push(workoutExercise.exercise?.exercise_type === 'cardio' ? formatCardioLine(set, index) : formatSetLine(set, index));
        });
      });

      return lines.join('\n');
    })
    .join('\n\n');

export const downloadTextFile = ({
  content,
  filename,
}: {
  content: string;
  filename: string;
}) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const subtractCalendarDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - days);
  return getLocalDateKey(result);
};

const isPastWorkout = (workout: ExportWorkout, today: string) =>
  workout.date < today || (workout.date === today && workout.status === 'completed');

export const filterWorkoutsForExport = ({
  workouts,
  scope,
  today = new Date(),
  weekStart,
}: {
  workouts: ExportWorkout[];
  scope: WorkoutExportScope;
  today?: Date;
  weekStart?: string;
}) => {
  const todayKey = getLocalDateKey(today);
  const pastWorkouts = workouts.filter(workout => isPastWorkout(workout, todayKey));

  switch (scope) {
    case 'all':
      return workouts;
    case 'planned':
      return workouts.filter(workout => workout.status === 'scheduled');
    case 'past':
      return pastWorkouts;
    case 'this-week':
      if (!weekStart) return [];
      return pastWorkouts.filter(workout => workout.date >= weekStart);
    case '2-weeks':
      return pastWorkouts.filter(workout => workout.date >= subtractCalendarDays(today, 14));
  }
};

const EXPORT_SCOPE_FILENAMES: Record<WorkoutExportScope, string> = {
  all: 'all',
  past: 'all-past',
  'this-week': 'this-week',
  '2-weeks': '2-weeks',
  planned: 'planned',
};

export const buildWorkoutExportFilename = (
  scope: WorkoutExportScope = 'all',
  today = new Date()
) => {
  const date = getLocalDateKey(today);

  return `iwynfitness-workouts-${EXPORT_SCOPE_FILENAMES[scope]}-${date}.txt`;
};
