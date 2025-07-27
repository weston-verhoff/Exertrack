import React, { useState } from 'react'
import { supabase } from '../../supabase/client'

type ConfiguredExercise = {
  id: string
  name: string
  target_muscle: string
  sets: number
  reps: number
}

type Props = {
  configuredExercises: ConfiguredExercise[]
  onComplete: () => void
}

export default function Step3_ScheduleAndSave({ configuredExercises, onComplete }: Props) {
  const [date, setDate] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const saveTemplate = async () => {
    if (!templateName) return

    const { data: templateData, error: templateError } = await supabase
      .from('templates')
      .insert([{ name: templateName }])
      .select()

    if (templateError || !templateData || !templateData[0]) {
      console.error('Error saving template:', templateError)
      return
    }

    const templateId = templateData[0].id

    const exerciseInserts = configuredExercises.map((e, index) => ({
      template_id: templateId,
      exercise_id: e.id,
      sets: e.sets,
      reps: e.reps,
      order: index
    }))

    const { error: exError } = await supabase
      .from('template_exercises')
      .insert(exerciseInserts)

    if (exError) console.error('Error saving template exercises:', exError)
    else {
      setSavingTemplate(false)
      setTemplateName('')
      alert('Template saved!')
    }
  }

  const scheduleWorkout = async () => {
    if (!date) return

    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .insert([{ date }])
      .select()

    if (workoutError || !workoutData || !workoutData[0]) {
      console.error('Error scheduling workout:', workoutError)
      return
    }

    const workoutId = workoutData[0].id

    const workoutExercises = configuredExercises.map((e, index) => ({
      workout_id: workoutId,
      exercise_id: e.id,
      sets: e.sets,
      reps: e.reps,
      weight: 0, // default until logged
      notes: '',
      order: index
    }))

    const { error: weError } = await supabase
      .from('workout_exercises')
      .insert(workoutExercises)

    if (weError) console.error('Error saving workout exercises:', weError)
    else {
      alert('Workout scheduled!')
      onComplete()
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ fontFamily: 'var(--font-headline)' }}>Schedule Workout</h2>

      <label>
        Select Date:{' '}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </label>

      <div style={{ marginTop: '1rem' }}>
        {savingTemplate ? (
          <>
            <input
              type="text"
              placeholder="Template name"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              style={{ marginRight: '0.5rem' }}
            />
            <button onClick={saveTemplate}>Save</button>
            <button onClick={() => setSavingTemplate(false)} style={{ marginLeft: '0.5rem' }}>
              Cancel
            </button>
          </>
        ) : (
          <button onClick={() => setSavingTemplate(true)}>Save as Template</button>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button
          style={{
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            border: 'none',
            borderRadius: '4px'
          }}
          onClick={scheduleWorkout}
        >
          Confirm & Schedule →
        </button>
      </div>
    </div>
  )
}
