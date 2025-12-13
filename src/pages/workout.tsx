import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { deleteWorkoutById } from '../utils/deleteWorkout';
import StatusButton from '../components/StatusButton'
import { WorkoutButton } from '../components/WorkoutButton'
import '../styles/workout.css' // ✅ Import your CSS file
import { Layout } from '../components/Layout';
import { Workout as WorkoutType, WorkoutExercise, WorkoutSet } from '../types/workout';
import { WorkoutDetails } from '../components/WorkoutDetails'
import { saveWorkout } from '../services/workoutService';

interface WorkoutData {
  id: string
  date: string
  status?: string
  workout_exercises: WorkoutExercise[]
}

// ✅ Reusable styles for summary lists
const listContainerStyle: React.CSSProperties = {
  width: '600px',
	marginBottom: '2rem',
	maxWidth: '100%',
}

const listItemStyle: React.CSSProperties = {
  marginBottom: '1rem',
  wordWrap: 'break-word',
  overflowWrap: 'break-word',
  lineHeight: '1.5'
}

export default function Workout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<WorkoutData | null>(null)
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
			      order,
			      exercise:exercise_id (
			        id,
			        name,
			        target_muscle
			      ),
			      workout_sets (
			        id,
			        set_number,
			        reps,
			        weight,
			        intensity_type,
			        notes
			      )
			    )
			  `)
			  .eq('id', id)
			  .order('order', { foreignTable: 'workout_exercises', ascending: true })
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
			    exercise:
			      we.exercise && typeof we.exercise === 'object'
			        ? Array.isArray(we.exercise)
			          ? we.exercise[0]
			          : we.exercise
			        : null,
			    workout_sets: we.workout_sets ?? []
			  }))
			}

      setWorkout(cleaned)
      setEditedExercises(cleaned.workout_exercises)
      setLoading(false)
    }

    fetchWorkout()
  }, [id])

	const saveUpdates = async (): Promise<void> => {
  try {
    // 1️⃣ Update workout date (if changed)
    if (workout?.date) {
      const { error: dateError } = await supabase
        .from('workouts')
        .update({ date: workout.date })
        .eq('id', workout.id);

      if (dateError) throw dateError;
    }

    // 2️⃣ Update each workout_set
    for (const ex of editedExercises) {
      for (const set of ex.workout_sets) {
        // If set has an ID, update it
        if (set.id) {
          const { error } = await supabase
            .from('workout_sets')
            .update({
              reps: set.reps,
              weight: set.weight,
              intensity_type: set.intensity_type ?? 'normal',
              notes: set.notes ?? null,
            })
            .eq('id', set.id);

          if (error) throw error;
        }
      }
    }
  } catch (err) {
    console.error(err);
    alert('Something went wrong while saving.');
    return;
  }
};

  if (loading) return <p>Loading recap...</p>
  if (!workout) return <p>Workout not found.</p>

	const volumeByExercise = editedExercises.map(we => {
	  const totalVolume = we.workout_sets.reduce(
	    (sum: number, s: WorkoutSet) => sum + s.reps * s.weight,
	    0
	  );

	  return {
	    name: we.exercise?.name ?? 'Unknown',
	    sets: we.workout_sets.length,
	    volume: totalVolume,
	  };
	});

	const muscleSummary: Record<string, number> = {};

	editedExercises.forEach(we => {
	  const muscle = we.exercise?.target_muscle ?? 'Unknown';

	  const volume = we.workout_sets.reduce(
	    (sum: number, s: WorkoutSet) => sum + s.reps * s.weight,
	    0
	  );

	  muscleSummary[muscle] = (muscleSummary[muscle] || 0) + volume;
	});
	const handleDeleteWorkout = async () => {
	  if (!workout) return;

	  const success = await deleteWorkoutById(workout.id);

	  if (!success) {
	    alert('Failed to delete workout.');
	    return;
	  }

	  navigate('/'); // or '/dashboard' if that’s your route
	};

  return (
    <Layout padded maxWidth="xl" scrollable>
		<h1>📈 Workout Recap</h1>

<WorkoutDetails
	workoutId={workout.id}
	date={workout.date}
	status={workout.status}
	exercises={editedExercises}
	onDateChange={date =>
		setWorkout(prev => prev ? { ...prev, date } : prev)
	}
	onSave={saveUpdates}
	onStatusChange={status =>
    setWorkout(prev => prev ? { ...prev, status } : prev)
  }
	onDelete={handleDeleteWorkout}
	onExercisesChange={setEditedExercises}
/>
    </Layout>
  )
}
