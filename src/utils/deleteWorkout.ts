import { supabase } from '../supabase/client'

export async function deleteWorkoutById(id: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('workouts').delete().eq('id', id).eq('user_id', userId)

  if (error) {
    console.error('Error deleting workout:', error)
    return false
  }

  return true
}
