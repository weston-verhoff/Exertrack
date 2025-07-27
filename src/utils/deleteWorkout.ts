import { supabase } from '../supabase/client'

export async function deleteWorkoutById(id: string): Promise<boolean> {
  const { error } = await supabase.from('workouts').delete().eq('id', id)

  if (error) {
    console.error('Error deleting workout:', error)
    return false
  }

  return true
}
