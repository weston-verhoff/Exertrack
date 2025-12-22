import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'

interface WorkoutExercise {
  id: string
  sets: number
  reps: number
  weight: number
  notes: string
  exercise: {
    name: string
    target_muscle: string
  }
}

interface Workout {
  id: string
  date: string
  template?: {
    name: string
  }
  workout_exercises: WorkoutExercise[]
}

export default function PastDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [volumeByMuscle, setVolumeByMuscle] = useState<Record<string, number>>({})
  const { userId, loading: authLoading } = useAuth()

  useEffect(() => {
    async function fetchWorkoutDetail() {
      if (!id || !userId) return

      const { data, error } = await supabase
        .from('workouts')
        .select(`
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
        `)
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching workout:', error)
      } else {
        const cleaned = {
          ...data,
          template: Array.isArray(data.template) ? data.template[0] : data.template,
          workout_exercises: data.workout_exercises.map((we: any) => ({
            ...we,
            exercise: Array.isArray(we.exercise) ? we.exercise[0] : we.exercise
          }))
        }

        setWorkout(cleaned as Workout)
        calculateVolume(cleaned.workout_exercises)
      }

      setLoading(false)
    }

    if (authLoading) return

    if (!userId) {
      setWorkout(null)
      setLoading(false)
      return
    }

    fetchWorkoutDetail()
  }, [authLoading, id, userId])

  const calculateVolume = (exs: WorkoutExercise[]) => {
    const volume: Record<string, number> = {}
    exs.forEach(e => {
      const muscle = e.exercise.target_muscle
      const liftVolume = e.sets * e.reps * (e.weight || 0)
      volume[muscle] = (volume[muscle] || 0) + liftVolume
    })
    setVolumeByMuscle(volume)
  }

  if (loading) return <p>Loading...</p>
  if (!workout) return <p>Workout not found.</p>

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>
        {workout.template?.name || 'Custom Workout'}
      </h1>
      <p>Date: {workout.date}</p>

      <section>
        <h2>Lifts Performed</h2>
        <ul>
          {workout.workout_exercises.map((e: WorkoutExercise) => (
            <li key={e.id}>
              <strong>{e.exercise.name}</strong> ({e.exercise.target_muscle})<br />
              Sets: {e.sets}, Reps: {e.reps}, Weight: {e.weight}<br />
              Notes: {e.notes || '—'}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Volume Summary</h2>
        <ul>
          {Object.entries(volumeByMuscle).map(([muscle, volume]) => (
            <li key={muscle}>
              {muscle}: {volume.toFixed(2)}
            </li>
          ))}
        </ul>
      </section>

      <div style={{ marginTop: '2rem' }}>
        <button onClick={() => navigate('/past')}>← Back to Past Workouts</button>
        <button onClick={() => navigate('/')}>🏠 Return to Dashboard</button>
      </div>
    </div>
  )
}
