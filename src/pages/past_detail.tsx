import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchWorkoutDetail } from '../services/workoutService'
import { ArrowLeft, Home } from 'lucide-react'
import { WorkoutButton } from '../components/WorkoutButton'

interface WorkoutExercise {
  id?: string
  sets: number
  reps: number | null
  weight: number | null
  duration_seconds?: number | null
  distance_value?: number | null
  distance_unit?: string | null
  notes?: string | null
  exercise: {
    name: string
    target_muscle: string
    exercise_type: 'strength' | 'cardio'
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
  const [setsByMuscle, setSetsByMuscle] = useState<Record<string, number>>({})
  const { userId, loading: authLoading } = useAuth()

  useEffect(() => {
    async function loadWorkoutDetail() {
      if (!id || !userId) return

			const { data, error } = await fetchWorkoutDetail({
        workoutId: id,
        userId,
      })

      if (error || !data) {
        console.error(error ?? 'Error fetching workout.')
      } else {
        setWorkout(data as Workout)
        calculateSets(data.workout_exercises)
			      }
      setLoading(false)
    }

    if (authLoading) return

    if (!userId) {
      setWorkout(null)
      setLoading(false)
      return
    }

    loadWorkoutDetail()
  }, [authLoading, id, userId])

  const calculateSets = (exs: WorkoutExercise[]) => {
    const setCounts: Record<string, number> = {}
    exs.forEach(e => {
      if (e.exercise.exercise_type !== 'strength') return
      const muscle = e.exercise.target_muscle
      setCounts[muscle] = (setCounts[muscle] || 0) + e.sets
    })
    setSetsByMuscle(setCounts)
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
              {e.exercise.exercise_type === 'cardio'
                ? `Segments: ${e.sets}, Duration: ${Math.round((e.duration_seconds ?? 0) / 60)} min${e.distance_value != null ? `, Distance: ${e.distance_value} ${e.distance_unit ?? ''}` : ''}`
                : `Sets: ${e.sets}, Reps: ${e.reps}, Weight: ${e.weight}`}<br />
              Notes: {e.notes || '—'}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Sets by Muscle Group</h2>
        <ul>
          {Object.entries(setsByMuscle).map(([muscle, sets]) => (
            <li key={muscle}>
              {muscle}: {sets} {sets === 1 ? 'set' : 'sets'}
            </li>
          ))}
        </ul>
      </section>

      <div style={{ marginTop: '2rem' }}>
        <WorkoutButton label="Back to Past Workouts" icon={<ArrowLeft size={18} />} variant="secondary" onClick={() => navigate('/past')} />
        <WorkoutButton label="Return to Dashboard" icon={<Home size={18} />} onClick={() => navigate('/')} />
      </div>
    </div>
  )
}
