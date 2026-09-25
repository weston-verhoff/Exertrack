import { useEffect, useState } from 'react';
import { ComponentTone } from '../utils/componentTone';
import { saveWorkout } from '../services/workoutService';
import { Workout } from '../types/workout';
import { useAuth } from '../context/AuthContext';
import { Drawer } from './Drawer';
import { WorkoutDetails } from './WorkoutDetails';

interface Props {
  workout: Workout;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onWorkoutUpdated: (workout: Workout) => void;
  tone?: ComponentTone;
}

const cloneExercises = (workout: Workout) =>
  workout.workout_exercises.map(exercise => ({
    ...exercise,
    workout_sets: exercise.workout_sets.map(set => ({ ...set })),
  }));

export function WorkoutDetailsDrawer({
  workout,
  isOpen,
  onClose,
  onDelete,
  onStatusChange,
  onWorkoutUpdated,
  tone,
}: Props) {
  const { userId } = useAuth();
  const [editedDate, setEditedDate] = useState(workout.date);
  const [localStatus, setLocalStatus] = useState(workout.status);
  const [editedExercises, setEditedExercises] = useState(() => cloneExercises(workout));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedDate(workout.date);
    setLocalStatus(workout.status);
    setEditedExercises(cloneExercises(workout));
  }, [workout, isOpen]);

  const resetAndClose = () => {
    setEditedDate(workout.date);
    setLocalStatus(workout.status);
    setEditedExercises(cloneExercises(workout));
    onClose();
  };

  return (
    <Drawer isOpen={isOpen} onClose={resetAndClose} width={520} tone={tone}>
      <WorkoutDetails
        workoutId={workout.id}
        date={editedDate}
        status={localStatus}
        exercises={editedExercises}
        onClose={resetAndClose}
        onDateChange={setEditedDate}
        onStatusChange={status => {
          setLocalStatus(status);
          onStatusChange(workout.id, status);
        }}
        onExercisesChange={setEditedExercises}
        onPersistedExercisesChange={persistedExercises => {
          setEditedExercises(persistedExercises);
          onWorkoutUpdated({
            ...workout,
            date: editedDate,
            status: localStatus,
            workout_exercises: persistedExercises,
          });
        }}
        isSaving={isSaving}
        onSave={async () => {
          setIsSaving(true);
          try {
            if (!userId) throw new Error('Missing user context');

            const { error } = await saveWorkout({
              workoutId: workout.id,
              date: editedDate,
              status: localStatus,
              exercises: editedExercises,
              userId,
            });
            if (error) throw new Error(error);

            onWorkoutUpdated({
              ...workout,
              date: editedDate,
              status: localStatus,
              workout_exercises: editedExercises,
            });
            onClose();
            return true;
          } catch (error) {
            console.error('Failed to save workout:', error);
            return false;
          } finally {
            setIsSaving(false);
          }
        }}
        onDelete={() => {
          onDelete(workout.id);
          resetAndClose();
        }}
      />
    </Drawer>
  );
}
