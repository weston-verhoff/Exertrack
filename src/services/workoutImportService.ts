import { supabase } from '../supabase/client';
import { ImportedWorkout } from '../utils/workoutImport';
import { createWorkoutFromBuilder, fetchWorkoutById } from './workoutService';
import { Workout } from '../types/workout';

export async function resolveImportedExercises(workouts: ImportedWorkout[], userId: string): Promise<ImportedWorkout[]> {
  const { data, error } = await supabase.from('exercises')
    .select('id, name, target_muscle, exercise_type, user_id')
    .or(`user_id.is.null,user_id.eq.${userId}`);
  if (error) throw new Error('Could not load exercises. Please try again.');
  return workouts.map(workout => ({ ...workout, exercises: workout.exercises.map(exercise => {
    const matches = (data ?? []).filter(item => item.name.trim().toLowerCase() === exercise.name.toLowerCase() && (item.exercise_type ?? 'strength') === exercise.exercise_type);
    return { ...exercise, exercise_id: matches.length === 1 ? matches[0].id : '', target_muscle: matches.length === 1 ? matches[0].target_muscle : undefined };
  }) }));
}

// Return successful previews individually so a retry never resaves them.
export async function saveImportedWorkout(workout: ImportedWorkout, userId: string): Promise<Workout> {
  if (workout.exercises.some(exercise => !exercise.exercise_id)) throw new Error('Resolve unknown or ambiguous exercise names before saving.');
  const result = await createWorkoutFromBuilder({ userId, date: workout.date, exercises: workout.exercises });
  if (result.error || !result.data) throw new Error(result.error ?? 'Could not save workout.');
  // Saving already succeeded: a failed refresh must not turn into a duplicate on retry.
  try {
    const refreshed = await fetchWorkoutById({ workoutId: result.data.id, userId });
    if (refreshed.data) return refreshed.data;
  } catch { /* Keep the saved schedule visible until the next page refresh. */ }
  return {
    id: result.data.id, date: workout.date, status: 'scheduled',
    workout_exercises: workout.exercises.map(exercise => ({
      id: exercise.id, exercise_id: exercise.exercise_id, order: exercise.order,
      exercise: { id: exercise.exercise_id, name: exercise.name, exercise_type: exercise.exercise_type, target_muscle: exercise.target_muscle ?? '' },
      workout_sets: exercise.sets.map(set => ({ ...set, completed: false })),
    })),
  };
}
