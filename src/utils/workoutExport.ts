import { ExportWorkout } from '../services/workoutExportService';
import { WorkoutSet } from '../types/workout';
import { formatDuration, paceSecondsPerUnit, speedPerHour } from './cardio';

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

  return `Set ${setNumber}: ${weight}lbs for ${reps} reps`;
};

const formatCardioLine = (set: WorkoutSet, index: number) => {
  const parts = [`Segment ${set.set_number ?? index + 1}: ${formatDuration(set.duration_seconds)}`];
  if (set.distance_value != null && set.distance_unit) parts.push(`${set.distance_value} ${set.distance_unit}`);
  if (set.calories != null) parts.push(`${set.calories} cal`);
  const pace = paceSecondsPerUnit(set.duration_seconds, set.distance_value);
  const speed = speedPerHour(set.duration_seconds, set.distance_value);
  if (pace != null && set.distance_unit) parts.push(`${formatDuration(pace)}/${set.distance_unit}`);
  if (speed != null && set.distance_unit) parts.push(`${speed.toFixed(2)} ${set.distance_unit}/h`);
  return parts.join(' | ');
};

export const formatWorkoutsAsText = (workouts: ExportWorkout[]) =>
  workouts
    .map(workout => {
      const lines = [formatWorkoutDate(workout.date)];

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

export const buildWorkoutExportFilename = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `iwynfitness-workouts-${year}-${month}-${day}.txt`;
};
