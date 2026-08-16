import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/workout.css' // ✅ Import your CSS file
import { Layout } from '../components/Layout';
import { Workout, WorkoutExercise, WorkoutSet } from '../types/workout';
import { WorkoutDetails } from '../components/WorkoutDetails'
import { useAuth } from '../context/AuthContext';
import { fetchWorkoutById, saveWorkout } from '../services/workoutService';
import { confirmAndDeleteWorkout } from '../utils/workoutActions';

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
			if (!userId || !id) return;

      const { data, error } = await fetchWorkoutById({
        workoutId: id,
        userId,
      });

      if (error || !data) {
				console.error(error ?? 'Error fetching workout.');
        setWorkout(null)
        setLoading(false)
        return
      }

			setWorkout(data)
      setEditedExercises(data.workout_exercises)
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
			setStatusMessage('Updating workout info...');
	    const { error } = await saveWorkout({
	      workoutId: workout.id,
        date: workout.date,
	      exercises: editedExercises,
	      userId,
        onlyExistingSets: true,
	    });

	    if (error) throw new Error(error);

	    setStatusMessage('Workout saved!');
	  } catch (err) {
	    console.error(err);
			setErrorMessage('Failed to save workout. Please try again.');
			setStatusMessage(null);
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
		(sum: number, s: WorkoutSet) => sum + Number(s.reps ?? 0) * Number(s.weight ?? 0),
		0
	);

	muscleSummary[muscle] = (muscleSummary[muscle] || 0) + volume;
});
const handleDeleteWorkout = async () => {
	if (!workout) return;
	if (!userId) return;

	const { deleted, error } = await confirmAndDeleteWorkout({
    workoutId: workout.id,
    userId,
    confirmationMessage: 'Delete workout? Cannot be undone.',
  });

  if (error) {
    alert(error);
    return;
  }

  if (!deleted) return;

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
