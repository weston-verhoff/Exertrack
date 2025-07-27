import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { WorkoutButton } from '../components/WorkoutButton'

type ExerciseProgress = {
  completed: number
  skipped: number[]
}

export default function WorkoutRunner() {
  const { id: workoutId } = useParams()
  const navigate = useNavigate()

  const [exercises, setExercises] = useState<any[]>([])
  const [progress, setProgress] = useState<Record<number, ExerciseProgress>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkoutExercises() {
      if (!workoutId) {
        console.warn('No workout ID found in URL.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('workout_exercises')
        .select('*, exercise:exercise_id(name, target_muscle)')
        .eq('workout_id', workoutId)
        .order('order', { ascending: true })

      if (error) {
        console.error('Error fetching workout exercises:', error)
      }

      const cleaned = (data ?? []).map((we: any) => ({
        ...we,
        exercise: we.exercise && typeof we.exercise === 'object'
          ? Array.isArray(we.exercise) ? we.exercise[0] : we.exercise
          : null
      }))

      const initialProgress = Object.fromEntries(
        cleaned.map(e => [e.id, { completed: 0, skipped: [] }])
      )

      setExercises(cleaned)
      setProgress(initialProgress)
      setLoading(false)
    }

    fetchWorkoutExercises()
  }, [workoutId])

  const updateField = (index: number, field: 'weight' | 'notes', value: any) => {
    const updated = [...exercises]
    updated[index][field] = value
    setExercises(updated)
  }

  const advanceSet = () => {
    const currentExercise = exercises[currentIndex]
    const { completed, skipped } = progress[currentExercise.id]
    const totalDone = completed + skipped.length
    const totalSets = currentExercise.sets

    const isLastExercise = currentIndex === exercises.length - 1
    const isExerciseComplete = totalDone === totalSets

    if (!isExerciseComplete) {
      setCurrentSet(totalDone + 1)
    } else if (isLastExercise) {
      finishWorkout()
    } else {
      setCurrentIndex(currentIndex + 1)
      setCurrentSet(1)
    }
  }

  const handleNextSet = () => {
    const currentId = exercises[currentIndex].id
    const updated = { ...progress }
    updated[currentId].completed += 1
    setProgress(updated)
    advanceSet()
  }

  const handleSkipSet = () => {
    const currentId = exercises[currentIndex].id
    const updated = { ...progress }
    updated[currentId].skipped = [...updated[currentId].skipped, currentSet]
    setProgress(updated)
    advanceSet()
  }

  const handleBackSet = () => {
    const currentExercise = exercises[currentIndex]
    const currentId = currentExercise.id
    const { completed, skipped } = progress[currentId]

    const updated = { ...progress }

    if (completed > 0) {
      updated[currentId].completed -= 1
    } else if (skipped.length > 0) {
      updated[currentId].skipped = skipped.slice(0, -1)
    } else if (currentIndex > 0) {
      const prevExercise = exercises[currentIndex - 1]
      const prevId = prevExercise.id
      const prevProgress = progress[prevId]
      const totalPrev = prevProgress.completed + prevProgress.skipped.length

      setCurrentIndex(currentIndex - 1)
      setCurrentSet(totalPrev)
      return
    } else {
      return
    }

    setProgress(updated)
    const totalDone = updated[currentId].completed + updated[currentId].skipped.length
    setCurrentSet(totalDone + 1)
  }

  const finishWorkout = async () => {
    if (!workoutId) {
      alert('Workout ID missing. Cannot navigate to recap.')
      return
    }

    const updates = exercises.map((e, index) => {
      const { skipped = [] } = progress[e.id] || {}
      return {
        id: e.id,
        workout_id: workoutId,
        exercise_id: e.exercise_id,
        sets: Math.max(0, e.sets - skipped.length),
        reps: e.reps,
        order: e.order ?? index,
        weight: e.weight || 0,
        notes: e.notes || ''
      }
    })

    const { error: exerciseError } = await supabase
      .from('workout_exercises')
      .upsert(updates)

    if (exerciseError) {
      console.error('Error updating workout exercises:', exerciseError)
      alert('Something went wrong while saving your workout.')
      return
    }

    const { error: statusError } = await supabase
      .from('workouts')
      .update({ status: 'completed' })
      .eq('id', workoutId)

    if (statusError) {
      console.error('Error updating workout status:', statusError)
      alert('Workout saved, but status update failed.')
      return
    }

    navigate(`/workout/${workoutId}`)
  }

  if (loading) return <p>Loading workout...</p>
  if (!exercises.length) return <p>No exercises found.</p>
  if (currentIndex >= exercises.length) {
    return (
      <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-headline)' }}>Workout Runner</h1>
        <p>✅ All exercises completed.</p>
        <WorkoutButton label="End Workout →" onClick={finishWorkout} variant="info" />
      </div>
    )
  }

  const current = exercises[currentIndex]
  const currentProgress = progress[current.id] || { completed: 0, skipped: [] }
  const exerciseName = current.exercise?.name ?? 'Unknown'
  const targetMuscle = current.exercise?.target_muscle ?? 'Unknown'
  const totalSets = current.sets || 1
  const isLastExercise = currentIndex === exercises.length - 1
  const isLastSet = currentProgress.completed + currentProgress.skipped.length === totalSets

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>Workout Runner</h1>

      <ExerciseHeader name={exerciseName} targetMuscle={targetMuscle} />
      <SetProgress
        current={currentSet}
        total={totalSets}
        skipped={currentProgress.skipped}
      />
      <SetEditor
        weight={current.weight || 0}
        reps={current.reps}
        notes={current.notes || ''}
        onChange={(field, value) => updateField(currentIndex, field, value)}
      />
      <ActionButtons
        isLast={isLastExercise && isLastSet}
        onNextSet={handleNextSet}
        onSkipSet={handleSkipSet}
        onFinish={finishWorkout}
        onBackSet={handleBackSet}
      />
    </div>
  )
}
function ExerciseHeader({ name, targetMuscle }: { name: string; targetMuscle: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h2>{name}</h2>
      <p style={{ color: '#888' }}>{targetMuscle}</p>
    </div>
  )
}

function SetProgress({
  current,
  total,
  skipped
}: {
  current: number
  total: number
  skipped: number[]
}) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
      {Array.from({ length: total }).map((_, i) => {
        const setNumber = i + 1
        const isSkipped = skipped.includes(setNumber)
        const isCompleted = setNumber < current && !isSkipped
        const isCurrent = setNumber === current

        let color = '#ccc'
        if (isSkipped) color = 'red'
        else if (isCompleted) color = '#2196f3'
        else if (isCurrent) color = '#4CAF50'

        return (
          <div
            key={i}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: color
            }}
          />
        )
      })}
    </div>
  )
}

function SetEditor({
  weight,
  reps,
  notes,
  onChange
}: {
  weight: number
  reps: number
  notes: string
  onChange: (field: 'weight' | 'notes', value: any) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label>
        Weight (lbs)
        <input
          type="number"
          value={weight}
          onChange={e => onChange('weight', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </label>

      <label>
        Reps
        <input type="number" value={reps} disabled style={{ width: '100%' }} />
      </label>

      <label>
        Notes
        <textarea
          value={notes}
          onChange={e => onChange('notes', e.target.value)}
          placeholder="Felt light today..."
          style={{ width: '100%', minHeight: '60px' }}
        />
      </label>
    </div>
  )
}

function ActionButtons({
  isLast,
  onNextSet,
  onSkipSet,
  onFinish,
  onBackSet
}: {
  isLast: boolean
  onNextSet: () => void
  onSkipSet: () => void
  onFinish: () => void
  onBackSet: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
      <WorkoutButton label="← Back" onClick={onBackSet} variant="info" />
      {isLast ? (
        <WorkoutButton label="End Workout →" onClick={onFinish} variant="info" />
      ) : (
        <>
          <WorkoutButton label="Next Set →" onClick={onNextSet} variant="info" />
          <WorkoutButton label="Skipped →" onClick={onSkipSet} variant="accent" />
        </>
      )}
    </div>
  )
}
