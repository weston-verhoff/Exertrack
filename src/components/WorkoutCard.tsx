import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { WorkoutButton } from './WorkoutButton';
import '../styles/WorkoutCard.css';
import { Workout } from '../types/workout';
import { Drawer } from './Drawer'
import { WorkoutDetails } from './WorkoutDetails';
import { saveWorkout } from '../services/workoutService';

interface WorkoutSet {
  set_number: number;
  reps: number;
  weight: number;
  intensity_type?: string;
}

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

function summarizeSets(sets: WorkoutSet[]) {
  if (!sets || sets.length === 0) return 'No sets logged';

  const reps = sets.map(s => s.reps);
  const weights = sets.map(s => s.weight);

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

  const variantClass = `workout-card ${variant} ${isNext ? 'highlight' : ''}`;
	const [editedDate, setEditedDate] = useState(workout.date);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [localStatus, setLocalStatus] = useState(workout.status);
	const [editedExercises, setEditedExercises] = useState(() =>
	  workout.workout_exercises.map(ex => ({
	    ...ex,
	    workout_sets: ex.workout_sets.map(set => ({ ...set })),
	  }))
	);

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
			        <span>{summarizeSets(we.workout_sets)}</span>
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
					onSave={async () => {
				    await saveWorkout({
				      workoutId: workout.id,
							date: editedDate,
				      status: localStatus,
				      exercises: editedExercises,
				    });
						onWorkoutUpdated({
					    ...workout,
					    date: editedDate,
					    status: localStatus,
					    workout_exercises: editedExercises,
					  });
				    closeDrawerAfterSave();
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
