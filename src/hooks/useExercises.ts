import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'

export function useExercises() {
  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExercises = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true })

    if (error) console.error('Error fetching exercises:', error)
    else setExercises(data || [])

    setLoading(false)
  }

  useEffect(() => {
    fetchExercises()
  }, [])

  return { exercises, loading, refetch: fetchExercises }
}
