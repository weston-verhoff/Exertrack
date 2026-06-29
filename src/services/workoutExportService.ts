import { supabase } from '../supabase/client';
import { Workout, WorkoutExercise, WorkoutSet } from '../types/workout';

export type ExportWorkout = Workout & {
  template?: {
    name: string;
  } | null;
};

type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};

const EXPORT_WORKOUT_SELECT_FIELDS = `
  id,
  date,
  status,
  template:template_id(name),
  workout_exercises (
    id,
    exercise_id,
    order,
    exercise:exercise_id (
      id,
      name,
      target_muscle
    ),
    workout_sets (
      id,
      workout_exercise_id,
      set_number,
      reps,
      weight,
      intensity_type,
      notes
    )
  )
`;

const normalizeExercise = (exercise: any) => {
  if (exercise && typeof exercise === 'object') {
    return Array.isArray(exercise) ? exercise[0] ?? null : exercise;
  }

  return null;
};

const normalizeTemplate = (template: any) => {
  if (template && typeof template === 'object') {
    return Array.isArray(template) ? template[0] ?? null : template;
  }

  return null;
};

const normalizeWorkoutExercises = (exercises: any[] = []): WorkoutExercise[] =>
  exercises
    .map(we => ({
      ...we,
      exercise:
        normalizeExercise(we.exercise) ?? {
          id: we.exercise_id ?? '',
          name: 'Unknown Exercise',
          target_muscle: 'Unknown',
        },
      workout_sets: (we.workout_sets ?? [])
        .slice()
        .sort((a: WorkoutSet, b: WorkoutSet) => a.set_number - b.set_number),
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const normalizeWorkout = (data: any): ExportWorkout => ({
  ...data,
  template: normalizeTemplate(data.template),
  workout_exercises: normalizeWorkoutExercises(data.workout_exercises),
});

export async function fetchWorkoutExportData({
  userId,
}: {
  userId: string;
}): Promise<ServiceResult<ExportWorkout[]>> {
  const { data, error } = await supabase
    .from('workouts')
    .select(EXPORT_WORKOUT_SELECT_FIELDS)
    .eq('user_id', userId)
    .or('status.neq.canceled,status.is.null')
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to fetch workouts for export.', error);
    return {
      data: null,
      error: 'Failed to export workouts. Please try again.',
    };
  }

  return {
    data: (data ?? []).map(normalizeWorkout),
    error: null,
  };
}
