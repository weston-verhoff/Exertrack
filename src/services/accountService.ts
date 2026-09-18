import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import { ExerciseType } from '../types/workout';
import { AppTheme, isAppTheme } from '../utils/theme';
import { ServiceResult } from './workoutService';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type DistanceSystem = 'imperial' | 'metric';
export type WeightSystem = 'imperial' | 'metric';

export interface AccountSettings {
  firstName: string;
  lastName: string;
  startOfWeek: Weekday;
  distanceSystem: DistanceSystem;
  weightSystem: WeightSystem;
  theme: AppTheme;
}

export interface CustomExercise {
  id: string;
  name: string;
  target_muscle: string;
  exercise_type: ExerciseType;
  is_custom: boolean;
  user_id: string;
}

const accountError = (message: string, error?: unknown) => {
  console.error(message, error);
  return message;
};

export const getAccountSettings = (user: User): AccountSettings => {
  const metadata = user.user_metadata ?? {};
  const startOfWeek = Number(metadata.start_of_week);

  return {
    firstName: typeof metadata.first_name === 'string' ? metadata.first_name : '',
    lastName: typeof metadata.last_name === 'string' ? metadata.last_name : '',
    startOfWeek: startOfWeek >= 0 && startOfWeek <= 6 ? (startOfWeek as Weekday) : 1,
    distanceSystem: metadata.distance_system === 'metric' ? 'metric' : 'imperial',
    weightSystem: metadata.weight_system === 'metric' ? 'metric' : 'imperial',
    theme: isAppTheme(metadata.theme) ? metadata.theme : 'default',
  };
};

export async function updateAccountSettings({
  settings,
  currentMetadata,
}: {
  settings: AccountSettings;
  currentMetadata: Record<string, unknown>;
}): Promise<ServiceResult<User>> {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      ...currentMetadata,
      first_name: settings.firstName.trim(),
      last_name: settings.lastName.trim(),
      start_of_week: settings.startOfWeek,
      distance_system: settings.distanceSystem,
      weight_system: settings.weightSystem,
      theme: settings.theme,
    },
  });

  if (error || !data.user) {
    return {
      data: null,
      error: accountError('Failed to save account settings.', error),
    };
  }

  return { data: data.user, error: null };
}

export async function fetchCustomExercises({
  userId,
}: {
  userId: string;
}): Promise<ServiceResult<CustomExercise[]>> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, target_muscle, exercise_type, is_custom, user_id')
    .eq('user_id', userId)
    .eq('is_custom', true)
    .order('name', { ascending: true });

  if (error) {
    return {
      data: null,
      error: accountError('Failed to load custom exercises.', error),
    };
  }

  return { data: (data ?? []) as CustomExercise[], error: null };
}

export async function updateCustomExercise({
  exercise,
  userId,
}: {
  exercise: Pick<CustomExercise, 'id' | 'name' | 'target_muscle' | 'exercise_type'>;
  userId: string;
}): Promise<ServiceResult<CustomExercise>> {
  const { data, error } = await supabase
    .from('exercises')
    .update({
      name: exercise.name.trim(),
      target_muscle: exercise.target_muscle.trim(),
      exercise_type: exercise.exercise_type,
    })
    .eq('id', exercise.id)
    .eq('user_id', userId)
    .eq('is_custom', true)
    .select('id, name, target_muscle, exercise_type, is_custom, user_id')
    .single();

  if (error || !data) {
    return {
      data: null,
      error: accountError('Failed to update custom exercise.', error),
    };
  }

  return { data: data as CustomExercise, error: null };
}
