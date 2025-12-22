// src/services/workoutService.ts
import { supabase } from '../supabase/client';
import { WorkoutExercise } from '../types/workout';

interface SaveWorkoutParams {
  workoutId: string;
  date?: string;
  status?: string;
  exercises: WorkoutExercise[];
  userId: string;
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
userId,
}: SaveWorkoutParams): Promise<void> {
 // 1️⃣ Update workout core fields
 if (date || status) {
	 const { error } = await supabase
		 .from('workouts')
		 .update({
			 ...(date ? { date } : {}),
			 ...(status ? { status } : {}),
		 })
		 .eq('id', workoutId)
     .eq('user_id', userId);

	 if (error) {
		 console.error('Failed to update workout:', error);
		 throw error;
	 }
 }

 // 2️⃣ Update sets
 const setRows = exercises.flatMap(ex =>
	 ex.workout_sets.map(set => ({
		 ...(set.id ? { id: set.id } : {}),
		 workout_exercise_id: set.workout_exercise_id ?? ex.id,
		 set_number: set.set_number,
		 reps: set.reps,
		 weight: set.weight,
		 intensity_type: set.intensity_type ?? 'normal',
		 notes: set.notes ?? null,
	 })),
 );

 if (setRows.length > 0) {
	 const { error } = await supabase
		 .from('workout_sets')
		 .upsert(setRows, { onConflict: 'id' });

	 if (error) {
		 console.error('Failed to update set:', error);
		 throw error;
	 }
 }
}
