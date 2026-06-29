import { ExportWorkout } from '../services/workoutService';
import { WorkoutSet } from '../types/workout';

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

export const formatWorkoutsAsText = (workouts: ExportWorkout[]) =>
  workouts
    .map(workout => {
      const lines = [formatWorkoutDate(workout.date)];

      workout.workout_exercises.forEach(workoutExercise => {
        lines.push(workoutExercise.exercise?.name ?? 'Unknown Exercise');
        workoutExercise.workout_sets.forEach((set, index) => {
          lines.push(formatSetLine(set, index));
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
