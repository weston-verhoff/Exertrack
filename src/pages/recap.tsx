import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'

export default function Recap() {
  const [searchParams] = useSearchParams()
  const workoutId = searchParams.get('workoutId')
  const navigate = useNavigate()
  const { userId, loading: authLoading } = useAuth()

  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [volumeByMuscle, setVolumeByMuscle] = useState<Record<string, number>>({})

  useEffect(() => {
    async function fetchWorkoutExercises() {
      if (!workoutId || !userId) return

      const { data, error } = await supabase
        .from('workout_exercises')
        .select('*, exercise:exercise_id(name, target_muscle)')
        .eq('workout_id', workoutId)
        .order('order', { ascending: true })

      if (error) console.error('Error fetching workout exercises:', error)
      else {
        setExercises(data || [])
        calculateVolume(data || [])
      }

      setLoading(false)
    }

    if (authLoading) return

    if (!userId) {
      setExercises([])
      setLoading(false)
      setVolumeByMuscle({})
      return
    }

    fetchWorkoutExercises()
  }, [authLoading, userId, workoutId])

  const calculateVolume = (data: any[]) => {
    const volume: Record<string, number> = {}
    data.forEach(e => {
      const muscle = e.exercise.target_muscle
      const liftVolume = e.sets * e.reps * (e.weight || 0)
      volume[muscle] = (volume[muscle] || 0) + liftVolume
    })
    setVolumeByMuscle(volume)
  }

  if (loading) return <p>Loading recap...</p>

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>Workout Recap</h1>

      <section>
        <h2>Lifts Completed</h2>
        <ul>
          {exercises.map(e => (
            <li key={e.id}>
              <strong>{e.exercise.name}</strong> ({e.exercise.target_muscle})<br />
              Sets: {e.sets}, Reps: {e.reps}, Weight: {e.weight}<br />
              Notes: {e.notes || '—'}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Volume by Muscle Group</h2>
        <ul>
          {Object.entries(volumeByMuscle).map(([muscle, vol]) => (
            <li key={muscle}>
              {muscle}: {vol.toFixed(2)}
            </li>
          ))}
        </ul>
      </section>

      <div style={{ marginTop: '2rem' }}>
        <button onClick={() => navigate('/past')} style={{ marginRight: '1rem' }}>
          View Past Workouts
        </button>
        <button onClick={() => navigate('/')}>
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}
