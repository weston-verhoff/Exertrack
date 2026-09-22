import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/workout.css' // ✅ Import your CSS file
import { Layout } from '../components/Layout';
import { Workout, WorkoutExercise, WorkoutSet } from '../types/workout';
import { WorkoutDetails, WorkoutSaveOptions } from '../components/WorkoutDetails'
import { useAuth } from '../context/AuthContext';
import { fetchWorkoutById, saveWorkout } from '../services/workoutService';
import { confirmAndDeleteWorkout } from '../utils/workoutActions';
import { useSystemAlerts } from '../context/SystemAlertContext';
import { TrendingUp } from 'lucide-react';

export default function WorkoutRecap() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [editedExercises, setEditedExercises] = useState<WorkoutExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { userId, loading: authLoading } = useAuth();
  const { dismissAlertGroup, showAlert } = useSystemAlerts();

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

	const saveUpdates = async (
    { announceSuccess = true }: WorkoutSaveOptions = {}
  ): Promise<boolean> => {
	  if (!workout || !userId) return false;

	  setSaving(true);
	  showAlert('Saving workout...', { replaceKey: 'workout-save' });

	  try {
			showAlert('Updating workout info...', { replaceKey: 'workout-save' });
	    const { error } = await saveWorkout({
	      workoutId: workout.id,
        date: workout.date,
	      exercises: editedExercises,
	      userId,
        onlyExistingSets: true,
	    });

	    if (error) throw new Error(error);

	    if (announceSuccess) {
        showAlert('Workout saved!', { tone: 'success', replaceKey: 'workout-save' });
      } else {
        dismissAlertGroup('workout-save');
      }
	    return true;
	  } catch (err) {
	    console.error(err);
			dismissAlertGroup('workout-save');
			showAlert('Failed to save workout. Please try again.', { tone: 'error' });
			return false;
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
    showAlert(error, { tone: 'error' });
    return;
  }

  if (!deleted) return;

	navigate('/'); // or '/dashboard' if that’s your route
};

return (
	<Layout padded maxWidth="xl" scrollable>
	<h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
	  <TrendingUp aria-hidden="true" size={28} /> Workout Details
	</h1>

<WorkoutDetails
fullPage
workoutId={workout.id}
date={workout.date}
status={workout.status}
exercises={editedExercises}
isSaving={saving}
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
