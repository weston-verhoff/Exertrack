import { Weekday } from '../services/accountService';
import { WorkoutDetailSummary, WorkoutExerciseSummary } from '../services/workoutService';

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getWeekStartDateKey = (startOfWeek: Weekday, today = new Date()) => {
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  const offset = (weekStart.getDay() - startOfWeek + 7) % 7;
  weekStart.setDate(weekStart.getDate() - offset);
  return localDateKey(weekStart);
};

export const getStrengthVolume = (exercise: WorkoutExerciseSummary) => {
  if (exercise.exercise.exercise_type !== 'strength') return 0;
  if (exercise.workout_sets?.length) {
    return exercise.workout_sets.reduce(
      (total, set) => total + Number(set.reps ?? 0) * Number(set.weight ?? 0),
      0
    );
  }
  return exercise.sets * Number(exercise.reps ?? 0) * Number(exercise.weight ?? 0);
};

export const getWeeklySummary = (
  workouts: WorkoutDetailSummary[],
  weekStart: string
) => {
  const workoutsThisWeek = workouts.filter(workout => workout.date >= weekStart);
  let strengthSets = 0;
  let cardioSeconds = 0;

  workoutsThisWeek.forEach(workout => {
    workout.workout_exercises.forEach(exercise => {
      if (exercise.exercise.exercise_type === 'strength') {
        strengthSets += exercise.workout_sets?.length ?? exercise.sets;
        return;
      }

      const segments: Array<{ duration_seconds?: number | null }> =
        exercise.workout_sets?.length ? exercise.workout_sets : [exercise];
      cardioSeconds += segments.reduce(
        (total, segment) => total + Number(segment.duration_seconds ?? 0),
        0
      );
    });
  });

  return {
    workouts: workoutsThisWeek,
    strengthSets,
    cardioMinutes: Math.round(cardioSeconds / 60),
  };
};
