import React, { useState } from 'react'
import { supabase } from '../../supabase/client'
import { useNavigate } from 'react-router-dom'

export type ConfiguredExercise = ExerciseConfig

interface ExerciseConfig {
  exercise_id: string
  name: string
  sets: number
  reps: number
  order: number
}

interface Step2Props {
  selectedExercises: ExerciseConfig[]
  onNext: (configured: ExerciseConfig[]) => void
}

export default function Step2_ConfigureCircuit({ selectedExercises, onNext }: Step2Props) {
  const [exercises, setExercises] = useState<ExerciseConfig[]>(
    selectedExercises.map((ex, i) => ({
      ...ex,
      sets: ex.sets ?? 3,
      reps: ex.reps ?? 10,
      order: i
    }))
  )

  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  )
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const handleSaveWorkout = async () => {
    if (exercises.length === 0) {
      alert('Add at least one exercise.')
      return
    }

    const validExercises = exercises.filter(e => !!e.exercise_id)
    const skipped = exercises.filter(e => !e.exercise_id)

    if (skipped.length > 0) {
      console.warn('Skipped exercises with missing IDs:', skipped)
      alert('Some exercises were skipped due to missing IDs.')
    }

    setSaving(true)

    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .insert([{ date: selectedDate, status: 'scheduled' }])
      .select()
      .single()

    if (workoutError || !workoutData) {
      console.error('Error creating workout:', workoutError)
      alert('Failed to create workout.')
      setSaving(false)
      return
    }

    const workoutId = workoutData.id

    const inserts = validExercises.map(ex => ({
      workout_id: workoutId,
      exercise_id: ex.exercise_id,
      sets: ex.sets,
      reps: ex.reps,
      weight: 0,
      order: ex.order
    }))

    const { error: insertError } = await supabase
      .from('workout_exercises')
      .insert(inserts)

    if (insertError) {
      console.error('Error saving exercises:', insertError)
      alert('Failed to save exercises.')
      setSaving(false)
      return
    }

    onNext(validExercises)
    navigate(`/workout/${workoutId}`)
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>🛠 Configure Circuit</h1>

      <label htmlFor="workout-date">Workout Date:</label>
      <input
        type="date"
        id="workout-date"
        value={selectedDate}
        onChange={e => setSelectedDate(e.target.value)}
        style={{ marginBottom: '1rem', padding: '0.4rem' }}
      />

      <h2>📋 Exercises</h2>
      {exercises.map((ex, i) => (
        <div key={i} style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            value={ex.name}
            disabled // 🔒 Prevent editing name to preserve exercise_id integrity
            style={{ marginRight: '0.5rem', backgroundColor: '#eee' }}
          />
          <input
            type="number"
            placeholder="Sets"
            value={ex.sets}
            onChange={e => {
              const updated = [...exercises]
              updated[i].sets = parseInt(e.target.value)
              setExercises(updated)
            }}
            style={{ width: '60px', marginRight: '0.5rem' }}
          />
          <input
            type="number"
            placeholder="Reps"
            value={ex.reps}
            onChange={e => {
              const updated = [...exercises]
              updated[i].reps = parseInt(e.target.value)
              setExercises(updated)
            }}
            style={{ width: '60px' }}
          />
        </div>
      ))}

      <br />

      <button
        onClick={handleSaveWorkout}
        disabled={saving}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'var(--accent-color)',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        💾 Save Workout
      </button>
    </div>
  )
}
