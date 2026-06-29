import { supabase } from '../supabase/client';
import { Workout, WorkoutExercise, WorkoutSet } from '../types/workout';
import { BuilderExerciseConfig } from '../types/workoutBuilder';

export type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};

export interface WorkoutWithTemplate extends Workout {
  template?: {
    name: string;
  } | null;
}

export type ExportWorkout = WorkoutWithTemplate;

export interface WorkoutExerciseSummary {
  id?: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string | null;
  exercise: {
    name: string;
    target_muscle: string;
  };
}

export interface WorkoutDetailSummary {
  id: string;
  date: string;
  template?: {
    name: string;
  } | null;
  workout_exercises: WorkoutExerciseSummary[];
}

const WORKOUT_SELECT_FIELDS = `
  id,
  date,
  status,
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

const WORKOUT_SELECT_FIELDS_WITH_TEMPLATE = `
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

const WORKOUT_DETAIL_FIELDS = `
  id,
  date,
  template:template_id(name),
  workout_exercises (
    id,
    sets,
    reps,
    weight,
    notes,
    exercise:exercise_id(name, target_muscle)
  )
`;

const WORKOUT_ANALYTICS_FIELDS = `
  id,
  date,
  workout_exercises (
    sets,
    reps,
    weight,
    exercise:exercise_id(name, target_muscle)
  )
`;

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const logAndReturnError = (message: string, error?: unknown): string => {
  console.error(message, error);
  return message;
};

export const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
      exercise: normalizeExercise(we.exercise),
      workout_sets: (we.workout_sets ?? [])
        .slice()
        .sort((a: WorkoutSet, b: WorkoutSet) => a.set_number - b.set_number),
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const normalizeWorkout = (data: any, includeTemplate = false): WorkoutWithTemplate => ({
  ...data,
  ...(includeTemplate ? { template: normalizeTemplate(data.template) } : {}),
  workout_exercises: normalizeWorkoutExercises(data.workout_exercises),
});

const normalizeSummaryExercises = (
  exercises: any[] = []
): WorkoutExerciseSummary[] =>
  exercises.map(we => ({
    ...we,
    exercise:
      normalizeExercise(we.exercise) ?? {
        name: 'Unknown',
        target_muscle: 'Unknown',
      },
  }));

const normalizeWorkoutSummaries = (data: any[] = []) =>
  data.map(w => ({
    ...w,
    workout_exercises: normalizeSummaryExercises(w.workout_exercises),
  }));

const normalizeWorkoutDetail = (data: any): WorkoutDetailSummary => ({
  ...data,
  template: normalizeTemplate(data.template),
  workout_exercises: normalizeSummaryExercises(data.workout_exercises),
});

const resolveWorkoutStatus = (status: string | null | undefined) =>
  status ?? 'scheduled';

const buildWorkoutSetRows = (
  exercises: WorkoutExercise[],
  options?: { onlyExisting?: boolean }
) => {
  const onlyExisting = options?.onlyExisting ?? false;
  return exercises.flatMap(ex =>
    ex.workout_sets
      .filter(set => !onlyExisting || Boolean(set.id))
      .map(set => ({
        ...(set.id ? { id: set.id } : {}),
        workout_exercise_id: set.workout_exercise_id ?? ex.id,
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        intensity_type: set.intensity_type ?? 'normal',
        notes: set.notes ?? null,
      }))
  );
};

const buildWorkoutExerciseRows = (exercises: BuilderExerciseConfig[]) =>
  exercises.map(ex => ({
    workout_id: '',
    exercise_id: ex.exercise_id,
    order: ex.order,
    sets: ex.sets.length,
    reps: ex.sets[0]?.reps ?? 0,
    weight: ex.sets[0]?.weight ?? 0,
  }));

const buildWorkoutSetInsertRows = (
  exercises: BuilderExerciseConfig[],
  workoutExerciseLookup: Map<string, string>
) =>
  exercises.flatMap(ex => {
    const workoutExerciseId = workoutExerciseLookup.get(
      `${ex.exercise_id}-${ex.order}`
    );
    if (!workoutExerciseId) return [];

    return ex.sets.map(set => ({
      workout_exercise_id: workoutExerciseId,
      set_number: set.set_number,
      reps: set.reps,
      weight: set.weight,
      intensity_type: set.intensity_type ?? 'normal',
      notes: set.notes ?? null,
    }));
  });

const normalizeBuilderExercises = (
  exercises: BuilderExerciseConfig[]
): BuilderExerciseConfig[] =>
  exercises
    .filter(ex => Boolean(ex.exercise_id))
    .map((ex, idx) => ({
      ...ex,
      order: idx,
      sets:
        ex.sets.length > 0
          ? ex.sets.map((set, setIdx) => ({
              set_number: setIdx + 1,
              reps: Number(set.reps ?? 0),
              weight: Number(set.weight ?? 0),
              intensity_type: set.intensity_type ?? 'normal',
              notes: set.notes ?? undefined,
            }))
          : [
              {
                set_number: 1,
                reps: Number(ex.sets[0]?.reps ?? 0),
                weight: Number(ex.sets[0]?.weight ?? 0),
                intensity_type: 'normal',
                notes: undefined,
              },
            ],
    }));

const insertWorkoutExercisesAndSets = async (
  workoutId: string,
  exercisesToSave: BuilderExerciseConfig[]
) => {
  const workoutExerciseRows = buildWorkoutExerciseRows(exercisesToSave).map(
    row => ({
      ...row,
      workout_id: workoutId,
    })
  );

  const { data: workoutExercises, error: exercisesError } = await supabase
    .from('workout_exercises')
    .insert(workoutExerciseRows)
    .select();

  if (exercisesError || !workoutExercises) {
    throw exercisesError ?? new Error('Failed to save workout exercises.');
  }

  const workoutExerciseLookup = new Map<string, string>();
  workoutExercises.forEach((row: any) => {
    const key = `${row.exercise_id}-${row.order}`;
    if (!workoutExerciseLookup.has(key)) {
      workoutExerciseLookup.set(key, row.id);
    }
  });

  const setRows = buildWorkoutSetInsertRows(
    exercisesToSave,
    workoutExerciseLookup
  );

  if (setRows.length === 0) return;

  const { error: setsError } = await supabase
    .from('workout_sets')
    .insert(setRows);

  if (setsError) {
    throw setsError;
  }
};

export async function saveWorkout({
  workoutId,
  date,
  status,
  exercises,
  userId,
  onlyExistingSets = false,
}: {
  workoutId: string;
  date?: string;
  status?: string;
  exercises: WorkoutExercise[];
  userId: string;
  onlyExistingSets?: boolean;
}): Promise<ServiceResult<null>> {
  try {
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
        return {
          data: null,
          error: logAndReturnError('Failed to update workout.', error),
        };
      }
    }

    const setRows = buildWorkoutSetRows(exercises, {
      onlyExisting: onlyExistingSets,
    });

    if (setRows.length > 0) {
      const { error } = await supabase
        .from('workout_sets')
        .upsert(setRows, { onConflict: 'id' });

      if (error) {
        return {
          data: null,
          error: logAndReturnError('Failed to update workout sets.', error),
        };
      }
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: logAndReturnError(DEFAULT_ERROR_MESSAGE, error),
    };
  }
}

export async function updateWorkoutStatus({
  workoutId,
  userId,
  status,
}: {
  workoutId: string;
  userId: string;
  status: string;
}): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('workouts')
    .update({ status })
    .eq('id', workoutId)
    .eq('user_id', userId);

  if (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to update workout status.', error),
    };
  }

  return { data: null, error: null };
}

export async function insertWorkoutSet({
  workoutExerciseId,
  setNumber,
  reps = 8,
  weight = 0,
  intensityType = 'normal',
  notes = null,
}: {
  workoutExerciseId: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  intensityType?: string;
  notes?: string | null;
}): Promise<ServiceResult<WorkoutSet>> {
  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      workout_exercise_id: workoutExerciseId,
      set_number: setNumber,
      reps,
      weight,
      intensity_type: intensityType,
      notes,
    })
    .select()
    .single();

  if (error || !data) {
    return {
      data: null,
      error: logAndReturnError('Failed to add workout set.', error),
    };
  }

  return {
    data: {
      id: data.id,
      workout_exercise_id: data.workout_exercise_id,
      set_number: data.set_number,
      reps: data.reps,
      weight: data.weight,
      intensity_type: data.intensity_type,
      notes: data.notes ?? undefined,
    },
    error: null,
  };
}

export async function deleteWorkoutSet({
  setId,
}: {
  setId: string;
}): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('workout_sets')
    .delete()
    .eq('id', setId);

  if (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to delete workout set.', error),
    };
  }

  return { data: null, error: null };
}

export async function deleteWorkout(
  workoutId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', userId);

  if (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to delete workout.', error),
    };
  }

  return { data: null, error: null };
}

export async function fetchWorkoutOverview({
  userId,
  includeTemplate,
  limitCompleted = 9,
}: {
  userId: string;
  includeTemplate?: boolean;
  limitCompleted?: number;
}): Promise<
  ServiceResult<{
    scheduled: WorkoutWithTemplate[];
    completed: WorkoutWithTemplate[];
    completedCount: number;
  }>
> {
  const fields = includeTemplate
    ? WORKOUT_SELECT_FIELDS_WITH_TEMPLATE
    : WORKOUT_SELECT_FIELDS;

  const [scheduledResponse, completedResponse] = await Promise.all([
    supabase
      .from('workouts')
      .select(fields)
      .eq('user_id', userId)
      .or('status.eq.scheduled,status.is.null')
      .order('date', { ascending: true }),
    supabase
      .from('workouts')
      .select(fields, { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(limitCompleted),
  ]);

  if (scheduledResponse.error || completedResponse.error) {
    return {
      data: null,
      error: logAndReturnError(
        'Failed to fetch workouts.',
        scheduledResponse.error ?? completedResponse.error
      ),
    };
  }

  const scheduled = (scheduledResponse.data ?? []).map(item =>
    normalizeWorkout(item, includeTemplate)
  );
  const completed = (completedResponse.data ?? []).map(item =>
    normalizeWorkout(item, includeTemplate)
  );

  const normalizedScheduled = scheduled.map(workout => ({
    ...workout,
    status: resolveWorkoutStatus(workout.status),
  }));

  const normalizedCompleted = completed.map(workout => ({
    ...workout,
    status: resolveWorkoutStatus(workout.status),
  }));

  return {
    data: {
      scheduled: normalizedScheduled,
      completed: normalizedCompleted,
      completedCount: completedResponse.count ?? normalizedCompleted.length,
    },
    error: null,
  };
}

export async function fetchAllCompletedWorkouts({
  userId,
  includeTemplate,
}: {
  userId: string;
  includeTemplate?: boolean;
}): Promise<ServiceResult<WorkoutWithTemplate[]>> {
  const fields = includeTemplate
    ? WORKOUT_SELECT_FIELDS_WITH_TEMPLATE
    : WORKOUT_SELECT_FIELDS;
  const { data, error } = await supabase
    .from('workouts')
    .select(fields)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('date', { ascending: false });

  if (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to fetch completed workouts.', error),
    };
  }

  const todayString = getLocalDateString();
  const normalized = (data ?? []).map(item =>
    normalizeWorkout(item, includeTemplate)
  );

  const completed = normalized.map(workout => ({
    ...workout,
    status:
      workout.status ??
      (workout.date >= todayString ? 'scheduled' : 'completed'),
  }));

  return { data: completed, error: null };
}

export async function fetchWorkoutExportData({
  userId,
}: {
  userId: string;
}): Promise<ServiceResult<ExportWorkout[]>> {
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_SELECT_FIELDS_WITH_TEMPLATE)
    .eq('user_id', userId)
    .or('status.neq.canceled,status.is.null')
    .order('date', { ascending: true });

  if (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to export workouts.', error),
    };
  }

  return {
    data: (data ?? []).map(item => normalizeWorkout(item, true)),
    error: null,
  };
}

export async function fetchWorkoutById({
  workoutId,
  userId,
}: {
  workoutId: string;
  userId: string;
}): Promise<ServiceResult<Workout>> {
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_SELECT_FIELDS)
    .eq('id', workoutId)
    .eq('user_id', userId)
    .order('order', { foreignTable: 'workout_exercises', ascending: true })
    .single();

  if (error || !data) {
    return {
      data: null,
      error: logAndReturnError('Failed to fetch workout.', error),
    };
  }

  return { data: normalizeWorkout(data), error: null };
}

export async function fetchWorkoutDetail({
  workoutId,
  userId,
}: {
  workoutId: string;
  userId: string;
}): Promise<ServiceResult<WorkoutDetailSummary>> {
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_DETAIL_FIELDS)
    .eq('id', workoutId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return {
      data: null,
      error: logAndReturnError('Failed to fetch workout details.', error),
    };
  }

  return { data: normalizeWorkoutDetail(data), error: null };
}

export async function fetchAnalyticsWorkouts({
  userId,
}: {
  userId: string;
}): Promise<ServiceResult<WorkoutDetailSummary[]>> {
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_ANALYTICS_FIELDS)
    .neq('status', 'canceled')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to fetch analytics workouts.', error),
    };
  }

  return { data: normalizeWorkoutSummaries(data ?? []), error: null };
}

export async function fetchTemplateBuilderExercises(
  templateId: string
): Promise<ServiceResult<BuilderExerciseConfig[]>> {
  const { data, error } = await supabase
    .from('template_exercises')
    .select(
      `
      exercise_id,
      sets,
      reps,
      order,
      exercise:exercises!template_exercises_exercise_id_fkey (
        id,
        name,
        target_muscle
      )
    `
    )
    .eq('template_id', templateId)
    .order('order', { ascending: true });

  if (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to import template.', error),
    };
  }

  const cleaned = (data ?? []).map((item: any, i: number) => ({
    id: `template-${templateId}-${item.exercise_id}-${i}`,
    exercise_id: item.exercise_id,
    name: item.exercise?.name ?? '',
    target_muscle: item.exercise?.target_muscle ?? '',
    order: item.order ?? i,
    sets: Array.from({ length: item.sets ?? 3 }, (_, idx) => ({
      set_number: idx + 1,
      reps: item.reps ?? 8,
      weight: 0,
      intensity_type: 'normal',
    })),
  }));

  return { data: cleaned, error: null };
}

export async function fetchWorkoutBuilderExercises(
  workoutId: string
): Promise<ServiceResult<{ exercises: BuilderExerciseConfig[]; date: string | null }>> {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select(
      `
      exercise_id,
      order,
      exercise:exercise_id (
        id,
        name,
        target_muscle
      ),
      workout_sets (
        set_number,
        reps,
        weight,
        intensity_type
      )
    `
    )
    .eq('workout_id', workoutId)
    .order('order', { ascending: true });

  if (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to import workout.', error),
    };
  }

  const { data: workoutMeta } = await supabase
    .from('workouts')
    .select('date')
    .eq('id', workoutId)
    .single();

  const importedDate = workoutMeta?.date ?? null;

  const cleaned = (data ?? []).map((item: any, i: number) => ({
    id: `workout-${workoutId}-${item.exercise_id}-${i}`,
    exercise_id: item.exercise_id,
    name: item.exercise?.name ?? '',
    target_muscle: item.exercise?.target_muscle ?? '',
    order: item.order ?? i,
    sets:
      item.workout_sets?.length > 0
        ? item.workout_sets.map((set: any, idx: number) => ({
            set_number: idx + 1,
            reps: set.reps ?? 0,
            weight: set.weight ?? 0,
            intensity_type: set.intensity_type ?? 'normal',
          }))
        : [
            {
              set_number: 1,
              reps: 8,
              weight: 0,
              intensity_type: 'normal',
            },
          ],
  }));

  return { data: { exercises: cleaned, date: importedDate }, error: null };
}

export async function createWorkoutFromBuilder({
  userId,
  date,
  exercises,
}: {
  userId: string;
  date: string;
  exercises: BuilderExerciseConfig[];
}): Promise<ServiceResult<{ id: string }>> {
  try {
    const normalizedExercises = normalizeBuilderExercises(exercises);

    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .insert([{ date, status: 'scheduled', user_id: userId }])
      .select()
      .single();

    if (workoutError || !workoutData) {
      return {
        data: null,
        error: logAndReturnError('Failed to create workout.', workoutError),
      };
    }

    await insertWorkoutExercisesAndSets(workoutData.id, normalizedExercises);
    return { data: { id: workoutData.id }, error: null };
  } catch (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to save workout.', error),
    };
  }
}

export async function updateWorkoutFromBuilder({
  workoutId,
  date,
  exercises,
}: {
  workoutId: string;
  date: string;
  exercises: BuilderExerciseConfig[];
}): Promise<ServiceResult<null>> {
  try {
    const normalizedExercises = normalizeBuilderExercises(exercises);

    const { error: deleteError } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('workout_id', workoutId);

    if (deleteError) {
      return {
        data: null,
        error: logAndReturnError('Failed to update workout.', deleteError),
      };
    }

    const { error: updateError } = await supabase
      .from('workouts')
      .update({ date })
      .eq('id', workoutId);

    if (updateError) {
      return {
        data: null,
        error: logAndReturnError('Failed to update workout.', updateError),
      };
    }

    await insertWorkoutExercisesAndSets(workoutId, normalizedExercises);

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to update workout.', error),
    };
  }
}

export async function duplicateWorkoutFromExercises({
  userId,
  exercises,
  date,
  status = 'scheduled',
}: {
  userId: string;
  exercises: BuilderExerciseConfig[];
  date: string;
  status?: string;
}): Promise<ServiceResult<{ id: string }>> {
  try {
    const normalizedExercises = normalizeBuilderExercises(exercises);
    if (normalizedExercises.length === 0) {
      return {
        data: null,
        error: 'No exercises available to duplicate.',
      };
    }

    const { data: newWorkout, error: workoutError } = await supabase
      .from('workouts')
      .insert({ date, status, user_id: userId })
      .select()
      .single();

    if (workoutError || !newWorkout) {
      return {
        data: null,
        error: logAndReturnError('Failed to create workout.', workoutError),
      };
    }

    await insertWorkoutExercisesAndSets(newWorkout.id, normalizedExercises);
    return { data: { id: newWorkout.id }, error: null };
  } catch (error) {
    return {
      data: null,
      error: logAndReturnError('Failed to duplicate workout.', error),
    };
  }
}

export const workoutService = {
  fetchWorkoutOverview,
  fetchAllCompletedWorkouts,
  fetchWorkoutExportData,
  fetchWorkoutById,
  fetchWorkoutDetail,
  fetchAnalyticsWorkouts,
  fetchTemplateBuilderExercises,
  fetchWorkoutBuilderExercises,
  saveWorkout,
  updateWorkoutStatus,
  deleteWorkout,
  createWorkoutFromBuilder,
  updateWorkoutFromBuilder,
  duplicateWorkoutFromExercises,
};
