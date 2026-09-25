import { supabase } from '../supabase/client';
import { ServiceResult } from './workoutService';

export interface WeightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  weighed_on: string;
  created_at: string;
}

const WEIGHT_ENTRY_COLUMNS =
  'id, user_id, weight_kg, weighed_on, created_at';

const weightError = (message: string, error?: unknown) => {
  console.error(message, error);
  return message;
};

export async function fetchWeightEntries({
  userId,
}: {
  userId: string;
}): Promise<ServiceResult<WeightEntry[]>> {
  const { data, error } = await supabase
    .from('weight_entries')
    .select(WEIGHT_ENTRY_COLUMNS)
    .eq('user_id', userId)
    .order('weighed_on', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    return {
      data: null,
      error: weightError('Failed to load weight history.', error),
    };
  }

  return { data: (data ?? []) as WeightEntry[], error: null };
}

export async function createWeightEntry({
  userId,
  weightKg,
  weighedOn,
}: {
  userId: string;
  weightKg: number;
  weighedOn: string;
}): Promise<ServiceResult<WeightEntry>> {
  const { data, error } = await supabase
    .from('weight_entries')
    .insert({ user_id: userId, weight_kg: weightKg, weighed_on: weighedOn })
    .select(WEIGHT_ENTRY_COLUMNS)
    .single();

  if (error || !data) {
    return {
      data: null,
      error: weightError('Failed to save weigh-in.', error),
    };
  }

  return { data: data as WeightEntry, error: null };
}

export async function updateWeightEntry({
  id,
  userId,
  weightKg,
  weighedOn,
}: {
  id: string;
  userId: string;
  weightKg: number;
  weighedOn: string;
}): Promise<ServiceResult<WeightEntry>> {
  const { data, error } = await supabase
    .from('weight_entries')
    .update({ weight_kg: weightKg, weighed_on: weighedOn })
    .eq('id', id)
    .eq('user_id', userId)
    .select(WEIGHT_ENTRY_COLUMNS)
    .single();

  if (error || !data) {
    return {
      data: null,
      error: weightError('Failed to update weigh-in.', error),
    };
  }

  return { data: data as WeightEntry, error: null };
}

export async function deleteWeightEntry({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('weight_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return {
      data: null,
      error: weightError('Failed to delete weigh-in.', error),
    };
  }

  return { data: null, error: null };
}
