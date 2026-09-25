import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { WorkoutButton } from './WorkoutButton';
import '../styles/WorkoutCard.css';
import { Workout, WorkoutSet as WorkoutSetType } from '../types/workout';
import { formatDuration } from '../utils/cardio';
import { ComponentTone } from '../utils/componentTone';
import { Trash2, Zap } from 'lucide-react';
import { WorkoutDetailsDrawer } from './WorkoutDetailsDrawer';

type WorkoutCardVariant = 'future-workout' | 'past-workout' | 'highlighted';

interface Props {
  workout: Workout;
  variant?: WorkoutCardVariant;
  isNext?: boolean;
  isToday?: boolean;
  onDelete: (id: string) => void;
	onStatusChange: (id: string, status: string) => void;
  onWorkoutUpdated: (workout: Workout) => void;
  tone?: ComponentTone;
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

  const summary = `${sets.length} sets | ${minReps === maxReps ? `${minReps} reps` : `${minReps}–${maxReps} reps`} | up to ${maxWeight} lb`;

  return (
    <>
      {summary}
      {hasIntensity && (
        <span aria-label="Includes intensity techniques" title="Includes intensity techniques">
          {' '}<Zap aria-hidden="true" size={14} style={{ display: 'inline', verticalAlign: '-0.125em' }} />
        </span>
      )}
    </>
  );
}

export function WorkoutCard({
  workout,
  variant = 'future-workout',
  isNext,
  isToday,
  onDelete,
	onStatusChange,
	onWorkoutUpdated,
  tone,
}: Props) {
  const navigate = useNavigate();
  const formattedDate = formatDateCompact(workout.date);
  const variantClass = `workout-card ${variant} ${isNext ? 'highlight' : ''}`;
	const [drawerOpen, setDrawerOpen] = useState(false);
	const showsFullPageDetails = variant === 'highlighted';
	const showsDetailsDrawer = !showsFullPageDetails;
	const [editedExercises, setEditedExercises] = useState(workout.workout_exercises);

	useEffect(() => {
			setEditedExercises(workout.workout_exercises);
		}, [workout]);
const openDetailsDrawer = () => {
  setDrawerOpen(true);
};

  return (
    <div className={variantClass} data-tone={tone}>
      <div className="workout-head">
        <span>{formattedDate}</span>
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
        {showsFullPageDetails && (
          <button
					className="start-btn btn"
					onClick={() => navigate(`/workout/${workout.id}`)}
				>
					Details
				</button>
			)}
			{showsDetailsDrawer && (
				<button
					className="start-btn btn"
					onClick={openDetailsDrawer}
				>
					Details
				</button>
			)}
			<WorkoutButton
				label="Delete"
				icon={<Trash2 size={18} />}
				variant="destructive"
				onClick={() => onDelete(workout.id)}
			/>
		</div>
		{showsDetailsDrawer && <WorkoutDetailsDrawer
			workout={workout}
			isOpen={drawerOpen}
			onClose={() => setDrawerOpen(false)}
			tone={tone}
			onDelete={onDelete}
			onStatusChange={onStatusChange}
			onWorkoutUpdated={onWorkoutUpdated}
		/>}
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
