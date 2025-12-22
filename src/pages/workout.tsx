import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { deleteWorkoutById } from '../utils/deleteWorkout';
import '../styles/workout.css' // ✅ Import your CSS file
import { Layout } from '../components/Layout';
import { Workout, WorkoutExercise, WorkoutSet } from '../types/workout';
import { WorkoutDetails } from '../components/WorkoutDetails'
import { useAuth } from '../context/AuthContext';
// import { saveWorkout } from '../services/workoutService';

// // ✅ Reusable styles for summary lists
// const listContainerStyle: React.CSSProperties = {
//   width: '600px',
// 	marginBottom: '2rem',
// 	maxWidth: '100%',
// }

// const listItemStyle: React.CSSProperties = {
//   marginBottom: '1rem',
//   wordWrap: 'break-word',
//   overflowWrap: 'break-word',
//   lineHeight: '1.5'
// }

export default function WorkoutRecap() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [editedExercises, setEditedExercises] = useState<WorkoutExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { userId, loading: authLoading } = useAuth();

  useEffect(() => {
    async function fetchWorkout() {
      if (!userId) return;
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
				        workout_exercise_id,
				        set_number,
				        reps,
				        weight,
				        intensity_type,
				        notes
			      )
			    )
			  `)
			  .eq('id', id)
        .eq('user_id', userId)
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

    if (authLoading) return;

    if (!userId) {
      setWorkout(null);
      setLoading(false);
      return;
    }

    fetchWorkout()
  }, [authLoading, id, userId])

	const saveUpdates = async (): Promise<void> => {
	  if (!workout) return;
    if (!userId) return;

	  setSaving(true);
	  setErrorMessage(null);
	  setStatusMessage('Saving workout...');

	  try {
	    if (workout.date) {
	      setStatusMessage('Updating workout info...');
	      const { error: dateError } = await supabase
	        .from('workouts')
	        .update({ date: workout.date })
	        .eq('id', workout.id)
          .eq('user_id', userId);

	      if (dateError) throw dateError;
	    }

		    const setRows = editedExercises.flatMap(ex =>
		      ex.workout_sets
		        .filter(set => !!set.id)
		        .map(set => ({
		          id: set.id,
		          workout_exercise_id: set.workout_exercise_id,
		          set_number: set.set_number,
		          reps: set.reps,
		          weight: set.weight,
		          intensity_type: set.intensity_type ?? 'normal',
		          notes: set.notes ?? null,
		        }))
	    );

	    if (setRows.length > 0) {
	      setStatusMessage('Saving sets...');
	      const { error: setsError } = await supabase
	        .from('workout_sets')
	        .upsert(setRows, { onConflict: 'id' });

	      if (setsError) throw setsError;
	    }

	    setStatusMessage('Workout saved!');
	  } catch (err) {
	    console.error(err);
			setErrorMessage('Failed to save workout. Please try again.');
		setStatusMessage(null);
		alert('Something went wrong while saving.');
	} finally {
		setSaving(false);
	}
};

if (loading) return <p>Loading recap...</p>
if (!workout) return <p>Workout not found.</p>

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
	if (!userId) return;

	const confirmed = window.confirm(
		'Delete workout? Cannot be undone.'
	);

	if (!confirmed) return;

	const success = await deleteWorkoutById(workout.id, userId);

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
isSaving={saving}
statusMessage={statusMessage}
errorMessage={errorMessage}
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
