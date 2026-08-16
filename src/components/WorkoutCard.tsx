import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { WorkoutButton } from './WorkoutButton';
import '../styles/WorkoutCard.css';
import { Workout, WorkoutSet as WorkoutSetType } from '../types/workout';
import { formatDuration } from '../utils/cardio';
import { Drawer } from './Drawer'
import { WorkoutDetails } from './WorkoutDetails';
import { saveWorkout } from '../services/workoutService';
import { useAuth } from '../context/AuthContext';

type WorkoutCardVariant = 'future-workout' | 'past-workout' | 'highlighted';

interface Props {
  workout: Workout;
  variant?: WorkoutCardVariant;
  isNext?: boolean;
  isToday?: boolean;
  onDelete: (id: string) => void;
	onStatusChange: (id: string, status: string) => void;
	onWorkoutUpdated: (workout: Workout) => void;

	onDrawerOpen?: () => void;
  onDrawerClose?: () => void;
}

function summarizeSets(sets: WorkoutSetType[], isCardio: boolean) {
  if (!sets || sets.length === 0) return 'No sets logged';

  if (isCardio) {
    const duration = sets.reduce((sum, set) => sum + Number(set.duration_seconds ?? 0), 0);
    const distances = sets.filter(set => set.distance_value != null);
    const distance = distances.length > 0 && new Set(distances.map(set => set.distance_unit)).size === 1
      ? ` | ${distances.reduce((sum, set) => sum + Number(set.distance_value), 0)} ${distances[0].distance_unit}`
      : '';
    return `${sets.length} segment${sets.length === 1 ? '' : 's'} | ${formatDuration(duration)}${distance}`;
  }

  const reps = sets.map(s => Number(s.reps ?? 0));
  const weights = sets.map(s => Number(s.weight ?? 0));

  const minReps = Math.min(...reps);
  const maxReps = Math.max(...reps);
  const maxWeight = Math.max(...weights);

  const hasIntensity = sets.some(s => s.intensity_type && s.intensity_type !== 'normal');

  return `${sets.length} sets | ${minReps === maxReps ? `${minReps} reps` : `${minReps}–${maxReps} reps`} | up to ${maxWeight} lb${hasIntensity ? ' ⚡' : ''}`;
}

export function WorkoutCard({
  workout,
  variant = 'future-workout',
  isNext,
  isToday,
  onDelete,
	onStatusChange,
	onDrawerOpen,
	onDrawerClose,
	onWorkoutUpdated,
}: Props) {
  const navigate = useNavigate();
  const formattedDate = formatDateCompact(workout.date);
	const { userId } = useAuth();

  const variantClass = `workout-card ${variant} ${isNext ? 'highlight' : ''}`;
	const [editedDate, setEditedDate] = useState(workout.date);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [localStatus, setLocalStatus] = useState(workout.status);
	const [isSaving, setIsSaving] = useState(false);
	const [editedExercises, setEditedExercises] = useState(() =>
	  workout.workout_exercises.map(ex => ({
	    ...ex,
	    workout_sets: ex.workout_sets.map(set => ({ ...set })),
	  }))
	);

	useEffect(() => {
			setEditedDate(workout.date);
			setLocalStatus(workout.status);
			setEditedExercises(
				workout.workout_exercises.map(ex => ({
					...ex,
					workout_sets: ex.workout_sets.map(set => ({ ...set })),
				}))
			);
		}, [workout]);

	const resetDraftState = () => {
  setEditedDate(workout.date);

  setEditedExercises(
    workout.workout_exercises.map(ex => ({
      ...ex,
      workout_sets: ex.workout_sets.map(set => ({ ...set })),
    }))
  );
};
const closeDrawer = () => {
  resetDraftState();
  setDrawerOpen(false);
  onDrawerClose?.();
};
const closeDrawerAfterSave = () => {
  setDrawerOpen(false); // ✅ do NOT reset
  onDrawerClose?.();
};

  return (
    <div className={variantClass}>
      <div className="workout-head">
        <span>{formattedDate}</span>
				<WorkoutButton
				  label="Details"
				  icon=""
				  variant={variant !== 'past-workout' ? 'whiteText' : 'blackText'}
					onClick={() => {
						resetDraftState();
				    setDrawerOpen(true);
				    onDrawerOpen?.(); // 🔑 notify parent
				  }}
				/>
      </div>

			<div className="lifts">
			  {[...editedExercises]
			    .sort((a, b) => a.order - b.order)
			    .map(we => (
			      <div className="lift" key={we.id}>
			        <span className="lift-name">
			          {we.exercise?.name ?? 'Unknown'}
			        </span>
			        <br />
			        <span>{summarizeSets(we.workout_sets, we.exercise?.exercise_type === 'cardio')}</span>
			      </div>
			    ))}
			</div>

      <div className="workout-btns">
        {variant !== 'past-workout'  && localStatus !== 'completed' && (
          <button
					className="start-btn btn"
					onClick={() => navigate(`/runner/${workout.id}`)}
				>
					Start
				</button>
			)}
			<WorkoutButton
				label="Delete"
				icon="🗑"
				variant="accent"
				onClick={() => onDelete(workout.id)}
			/>
		</div>
		<Drawer
			isOpen={drawerOpen}
			onClose={closeDrawer}
			width={520}
		>
			<WorkoutDetails
				workoutId={workout.id}
				date={editedDate}
				status={localStatus}
				exercises={editedExercises}
				onClose={closeDrawer}
				onDateChange={setEditedDate}   // optional: wire if you want editing here
				onStatusChange={status => {
					setLocalStatus(status);                // immediate UI
					onStatusChange(workout.id, status);    // notify parent
				}}
				onExercisesChange={setEditedExercises}
				isSaving={isSaving}
				onSave={async () => {
					setIsSaving(true);
					try {
						if (!userId) {
              throw new Error('Missing user context');
            }
						const { error } = await saveWorkout({
							workoutId: workout.id,
							date: editedDate,
							status: localStatus,
							exercises: editedExercises,
							userId,
						});
						if (error) {
              throw new Error(error);
            }
						onWorkoutUpdated({
							...workout,
							date: editedDate,
							status: localStatus,
							workout_exercises: editedExercises,
						});
						closeDrawerAfterSave();
					} catch (error) {
						console.error('Failed to save workout:', error);
					} finally {
						setIsSaving(false);
					}
				}}
				onDelete={async () => {
					// 🔑 1. Tell parent to delete
					onDelete(workout.id);

					// 🔑 2. Close drawer locally
					closeDrawer();
				}}
			/>
		</Drawer>
	</div>
);
}

function formatDateCompact(dateStr: string) {
const [year, month, day] = dateStr.split('-').map(Number);
const date = new Date(year, month - 1, day);

const weekday = new Intl.DateTimeFormat('en-US', {
	weekday: 'short',
}).format(date);

const compactDate = new Intl.DateTimeFormat('en-US', {
	month: 'numeric',
	day: 'numeric',
    year: '2-digit',
  }).format(date);

  return `${compactDate} (${weekday})`;
}
