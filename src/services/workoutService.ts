// src/services/workoutService.ts
import { supabase } from '../supabase/client';
import { WorkoutExercise } from '../types/workout';

interface SaveWorkoutParams {
  workoutId: string;
  date?: string;
  status?: string;
  exercises: WorkoutExercise[];
}

/**
 * Persists workout metadata + all sets
 * Safe to call from:
 * - workout page
 * - recap
 * - drawer
 * - planner
 */
export async function saveWorkout({
  workoutId,
  date,
  status,
  exercises,
}: SaveWorkoutParams): Promise<void> {
  // 1️⃣ Update workout core fields
  if (date || status) {
    const { error } = await supabase
      .from('workouts')
      .update({
        ...(date ? { date } : {}),
        ...(status ? { status } : {}),
      })
      .eq('id', workoutId);

    if (error) {
      console.error('Failed to update workout:', error);
      throw error;
    }
  }

  // 2️⃣ Update sets
  for (const ex of exercises) {
    for (const set of ex.workout_sets) {
      if (!set.id) continue;

      const { error } = await supabase
        .from('workout_sets')
        .update({
          reps: set.reps,
          weight: set.weight,
          intensity_type: set.intensity_type ?? 'normal',
          notes: set.notes ?? null,
        })
        .eq('id', set.id);

      if (error) {
        console.error('Failed to update set:', error);
        throw error;
      }
    }
  }
}
