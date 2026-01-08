import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { WorkoutButton } from '../components/WorkoutButton'
import { Layout } from '../components/Layout';
import { WorkoutExercise, WorkoutSet } from '../types/workout';
import { useAuth } from '../context/AuthContext';
import { fetchWorkoutById, saveWorkout } from '../services/workoutService';

export default function WorkoutRunner() {
  const { id: workoutId } = useParams()
  const navigate = useNavigate()
  const { userId, loading: authLoading } = useAuth()

	const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0)
	const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [loading, setLoading] = useState(true)

	const currentExercise = exercises[currentIndex];
	const currentSet = currentExercise?.workout_sets[currentSetIndex];


  useEffect(() => {
    async function fetchWorkoutExercises() {
      if (!workoutId || !userId) {
        console.warn('No workout ID found in URL.')
        setLoading(false)
        return
      }

			const { data, error } = await fetchWorkoutById({
	        workoutId,
	        userId,
	      });

				if (error || !data) {
				  console.error(error ?? 'Failed to load workout.');
				  setLoading(false);
				  return;
				}

      setExercises(data.workout_exercises)
      setLoading(false)
    }

    if (authLoading) return

    if (!userId) {
      setExercises([])
      setLoading(false)
      return
    }

    fetchWorkoutExercises()
  }, [authLoading, userId, workoutId])

  const updateCurrentSet = (field: 'weight' | 'reps' | 'notes', value: any) => {
	  setExercises(prev =>
	    prev.map((ex, exIdx) =>
	      exIdx !== currentIndex
	        ? ex
	        : {
	            ...ex,
	            workout_sets: ex.workout_sets.map((set: WorkoutSet, setIdx: number) =>
	              setIdx !== currentSetIndex
	                ? set
	                : { ...set, [field]: value }
	            ),
	          }
	    )
	  );
	};

	const handleNextSet = () => {
	  const isLastSet =
	    currentSetIndex === currentExercise.workout_sets.length - 1;

	  if (!isLastSet) {
	    setCurrentSetIndex(i => i + 1);
	  } else if (currentIndex < exercises.length - 1) {
	    setCurrentIndex(i => i + 1);
	    setCurrentSetIndex(0);
	  } else {
	    finishWorkout();
	  }
	};

	const handleBackSet = () => {
	  if (currentSetIndex > 0) {
	    setCurrentSetIndex(i => i - 1);
	  } else if (currentIndex > 0) {
	    const prevExercise = exercises[currentIndex - 1];
	    setCurrentIndex(i => i - 1);
	    setCurrentSetIndex(prevExercise.workout_sets.length - 1);
	  }
	};

	const finishWorkout = async () => {
		if (authLoading || !userId) return;

		const { error } = await saveWorkout({
	      workoutId: workoutId!,
	      status: 'completed',
	      exercises,
	      userId,
	    });

	  if (error) {
	    console.error(error);
	    alert(error);
	    return;
	  }

	  navigate(`/workout/${workoutId}`);
	};


  if (loading) return <p>Loading workout...</p>
  if (!exercises.length) return <p>No exercises found.</p>
  if (currentIndex >= exercises.length) {
    return (
			<Layout padded maxWidth="md">
			  <h1 className="headline">Workout Runner</h1>
			  <p>✅ All exercises completed.</p>
			  <WorkoutButton label="End Workout →" onClick={finishWorkout} variant="info" />
			</Layout>
    )
  }

  const current = exercises[currentIndex]
  const exerciseName = current.exercise?.name ?? 'Unknown'
  const targetMuscle = current.exercise?.target_muscle ?? 'Unknown'
	if (!currentExercise || !currentSet) {
	  return <p>Loading workout...</p>;
	}
	const isLastExercise = currentIndex === exercises.length - 1;
	const isLastSet = currentSetIndex === currentExercise.workout_sets.length - 1;
  return (
		<Layout padded maxWidth="md">
		<WorkoutProgressBar current={currentIndex} total={exercises.length} />
		  <h1 className="headline">Workout Runner</h1>

		  <ExerciseHeader name={exerciseName} targetMuscle={targetMuscle} />
			<SetProgress
			  current={currentSetIndex + 1}
			  total={currentExercise.workout_sets.length}
			/>
			<SetEditor
			  weight={currentSet.weight ?? 0}
			  reps={currentSet.reps}
			  notes={currentSet.notes ?? ''}
			  onChange={updateCurrentSet}
			/>
		  <ActionButtons
		    isLast={isLastExercise && isLastSet}
		    onNextSet={handleNextSet}
		    onFinish={finishWorkout}
		    onBackSet={handleBackSet}
		  />
		</Layout>
  )
}
function ExerciseHeader({ name, targetMuscle }: { name: string; targetMuscle: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h2>{name}</h2>
      <p style={{ color: 'var(--neutral-225)' }}>{targetMuscle}</p>
    </div>
  )
}

function SetProgress({
  current,
  total
}: {
  current: number
  total: number
}) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
      {Array.from({ length: total }).map((_, i) => {
        const setNumber = i + 1
        const isCompleted = setNumber < current
        const isCurrent = setNumber === current

				let color = 'var(--neutral-125)'
        if (isCompleted) color = 'var(--info-color)'
        else if (isCurrent) color = 'var(--success-strong)'

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
  onChange: (field: 'weight' | 'notes' | 'reps', value: any) => void
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
				<input
				  type="number"
				  value={reps}
				  onChange={e => onChange('reps', parseInt(e.target.value))}
				  style={{ width: '100%' }}
				/>
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
  onFinish,
  onBackSet
}: {
  isLast: boolean
  onNextSet: () => void
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
        </>
      )}
    </div>
  )
}
function WorkoutProgressBar({ current, total }: { current: number; total: number }) {
  const percent = Math.round((current / total) * 100)

  return (
    <div style={{ marginBottom: '1rem', backgroundColor: 'var(--bg-30)', padding: '0.75rem', borderRadius: '0.5rem' }}>
      <div
        style={{
          height: '16px',
          width: '100%',
          backgroundColor: 'var(--neutral-75)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            backgroundColor: 'var(--info-color)',
            transition: 'width 0.3s ease',
						borderRadius: '8px'
          }}
        />
      </div>
			<div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
        <strong>{total - current} workout{total - current !== 1 ? 's' : ''} left</strong>
      </div>
    </div>
  )
}
