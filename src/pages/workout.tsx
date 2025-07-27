import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import StatusButton from '../components/StatusButton'

interface WorkoutExercise {
  id: string
  sets: number
  reps: number
  weight: number
  order: number
  exercise: {
    name: string
    target_muscle: string
  } | null
}

interface Workout {
  id: string
  date: string
  status?: string
  workout_exercises: WorkoutExercise[]
}

export default function WorkoutRecap() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [editedExercises, setEditedExercises] = useState<WorkoutExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkout() {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          status,
          workout_exercises (
            id,
            sets,
            reps,
            weight,
            order,
            exercise:exercise_id(name, target_muscle)
          )
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        console.error('Error fetching workout:', error)
        setWorkout(null)
        setLoading(false)
        return
      }

      const cleaned = {
        ...data,
        workout_exercises: data.workout_exercises.map((we: any) => ({
          ...we,
          exercise: we.exercise && typeof we.exercise === 'object'
            ? Array.isArray(we.exercise) ? we.exercise[0] : we.exercise
            : null
        }))
      }

      setWorkout(cleaned)
      setEditedExercises(cleaned.workout_exercises)
      setLoading(false)
    }

    fetchWorkout()
  }, [id])

  const updateField = (index: number, field: 'sets' | 'reps' | 'weight', value: number) => {
    const updated = [...editedExercises]
    updated[index][field] = value
    setEditedExercises(updated)
  }

  const saveUpdates = async (): Promise<void> => {
    try {
      for (let i = 0; i < editedExercises.length; i++) {
        const ex = editedExercises[i]
        const { error } = await supabase
          .from('workout_exercises')
          .update({
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight
          })
          .eq('id', ex.id)

        if (error) {
          console.error('Error updating workout exercise:', error)
          throw new Error('Failed to update')
        }
      }

      if (workout?.date) {
        const { error: dateError } = await supabase
          .from('workouts')
          .update({ date: workout.date })
          .eq('id', workout.id)

        if (dateError) {
          console.error('Error updating workout date:', dateError)
          throw new Error('Failed to update workout date')
        }
      }
    } catch (err) {
      alert('Something went wrong while saving.')
    }
  }

  if (loading) return <p>Loading recap...</p>
  if (!workout) return <p>Workout not found.</p>

  const volumeByExercise = editedExercises.map(we => ({
    name: we.exercise?.name ?? 'Unknown',
    sets: we.sets,
    reps: we.reps,
    weight: we.weight,
    volume: we.sets * we.reps * (we.weight ?? 0)
  }))

  const muscleSummary: Record<string, number> = {}
  editedExercises.forEach(we => {
    const key = we.exercise?.target_muscle ?? 'Unknown'
    const vol = we.sets * we.reps * (we.weight ?? 0)
    muscleSummary[key] = (muscleSummary[key] || 0) + vol
  })

  return (
    <div style={{ padding: '1rem' }}>
      <h1>📈 Workout Recap</h1>

      <label style={{ display: 'block', marginBottom: '1rem' }}>
        <strong>Date:</strong>{' '}
        <input
          type="date"
          value={workout.date}
          onChange={e =>
            setWorkout(prev => prev ? { ...prev, date: e.target.value } : prev)
          }
          style={{ padding: '0.25rem', fontSize: '1rem' }}
        />
      </label>

      <p><strong>Status:</strong> {workout.status ?? 'completed'}</p>

      <h2>🏋️ Exercises</h2>
      <ul>
        {editedExercises.map((we, i) => (
          <li key={we.id} style={{ marginBottom: '1rem' }}>
            <strong>{we.exercise?.name ?? 'Unknown'}</strong><br />
            Sets:{' '}
            <input
              type="number"
              value={we.sets}
              onChange={e => updateField(i, 'sets', parseInt(e.target.value))}
              style={{ width: '60px', marginRight: '0.5rem' }}
            />
            Reps:{' '}
            <input
              type="number"
              value={we.reps}
              onChange={e => updateField(i, 'reps', parseInt(e.target.value))}
              style={{ width: '60px', marginRight: '0.5rem' }}
            />
            Weight:{' '}
            <input
              type="number"
              value={we.weight}
              onChange={e => updateField(i, 'weight', parseFloat(e.target.value))}
              style={{ width: '60px' }}
            />
          </li>
        ))}
      </ul>

      <StatusButton
        onClick={saveUpdates}
        idleLabel="💾 Save Changes"
        successLabel="✅ Workout Saved!"
        accentColor="#eee"
        successColor="#4CAF50"
      />

      <h2>📊 Volume Summary</h2>
      <ul>
        {volumeByExercise.map((ve, i) => (
          <li key={i}>
            {ve.name}: {ve.sets}×{ve.reps} @ {ve.weight ?? 0} lbs → Volume: {ve.volume}
          </li>
        ))}
      </ul>

      <h2>🧠 Muscle Volume Breakdown</h2>
      <ul>
        {Object.entries(muscleSummary).map(([muscle, vol], i) => (
          <li key={i}>{muscle}: {vol}</li>
        ))}
      </ul>

      <button onClick={() => navigate('/')}>🏠 Back to Dashboard</button>
    </div>
  )
}
