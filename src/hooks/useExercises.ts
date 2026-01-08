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

	const addExercise = (exercise: any) => {
    setExercises(prev => {
      const exists = prev.some(item => item.id === exercise.id)
      if (exists) return prev
      const next = [...prev, exercise]
      return next.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    })
  }

  return { exercises, loading, refetch: fetchExercises, addExercise }
}
