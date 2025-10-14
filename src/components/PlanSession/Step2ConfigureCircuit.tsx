import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkoutButton } from '../../components/WorkoutButton';

export type ConfiguredExercise = ExerciseConfig;

interface ExerciseConfig {
  exercise_id: string;
  name: string;
  sets: number;
  reps: number;
  order: number;
}

// --- Update Step2Props to include editingWorkout args ---
export interface Step2Props {
  selectedExercises: ConfiguredExercise[];
  onNext: (configured?: ConfiguredExercise[]) => void | Promise<void>;
  isEditingTemplate?: boolean;
  templateId?: string;
  onSaveTemplate?: (configured: ConfiguredExercise[]) => Promise<void>;
  // NEW props for editing an existing workout
  isEditingWorkout?: boolean;
  editingWorkoutId?: string;
}

function SortableExercise({
  ex,
  index,
  onChange,
  onRemove
}: {
  ex: ExerciseConfig;
  index: number;
  onChange: (index: number, field: 'sets' | 'reps', value: number) => void;
  onRemove: (exercise_id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: ex.exercise_id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '0.5rem',
    marginBottom: '1rem',
    backgroundColor: 'var(--bg-20)',
    border: '1px solid #3a4a55',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'white',
		overflow: 'hidden',
  };

  return (
		<div ref={setNodeRef} style={style}>
		  <span
		    style={{ cursor: 'grab' }}
		    {...attributes}
		    {...listeners}
		  >
		    ☰
		  </span>
      <WorkoutButton
        label=""
        icon="🗑"
        variant="accent"
        onClick={() => onRemove(ex.exercise_id)}
      />
			<div
  style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    flex: 1,
    minWidth: 0
  }}
>
	  <input
	    type="text"
	    value={ex.name}
	    disabled
	    style={{
	      backgroundColor: '#3f4f5d',
	      color: 'white',
	      flex: 1,
	      minWidth: '120px'
	    }}
	  />
	  <input
	    type="number"
	    placeholder="Sets"
	    value={ex.sets}
	    onChange={e => onChange(index, 'sets', parseInt(e.target.value))}
	    style={{
	      width: '40px'
	    }}
	  />
	  <input
	    type="number"
	    placeholder="Reps"
	    value={ex.reps}
	    onChange={e => onChange(index, 'reps', parseInt(e.target.value))}
	    style={{
	      width: '40px'
	    }}
	  />
	</div>

    </div>
  );
}


export default function Step2ConfigureCircuit({
  selectedExercises,
  onNext,
  isEditingTemplate,
  onSaveTemplate,
  isEditingWorkout,
  editingWorkoutId
}: Step2Props) {
  const [exercises, setExercises] = useState<ExerciseConfig[]>(
    selectedExercises.map((ex, i) => ({
      ...ex,
      sets: ex.sets ?? 3,
      reps: ex.reps ?? 10,
      order: i
    }))
  );

  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exercises.findIndex(e => e.exercise_id === active.id);
    const newIndex = exercises.findIndex(e => e.exercise_id === over.id);

    const reordered = arrayMove(exercises, oldIndex, newIndex).map((ex, i) => ({
      ...ex,
      order: i
    }));

    setExercises(reordered);
  };

  const handleChange = (index: number, field: 'sets' | 'reps', value: number) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

	const handleRemoveExercise = (exercise_id: string) => {
	  const updated = exercises
	    .filter((e: ExerciseConfig) => e.exercise_id !== exercise_id)
	    .map((e: ExerciseConfig, i: number) => ({
	      ...e,
	      order: i
	    }));
	  setExercises(updated);
		console.log('Removed!');
	};

	const handleSaveWorkout = async () => {
		if (exercises.length === 0) {
			alert('Add at least one exercise.');
			return;
		}

		const validExercises = exercises.filter(e => !!e.exercise_id);
		const skipped = exercises.filter(e => !e.exercise_id);

		if (skipped.length > 0) {
			console.warn('Skipped exercises with missing IDs:', skipped);
			alert('Some exercises were skipped due to missing IDs.');
		}

		setSaving(true);

		try {
			if (isEditingWorkout && editingWorkoutId) {
				// -----------------------
				// EDIT EXISTING WORKOUT
				// -----------------------
				// 1) Update the workouts row (date & status if needed)
				const { error: updateWorkoutError } = await supabase
					.from('workouts')
					.update({ date: selectedDate, status: 'scheduled' })
					.eq('id', editingWorkoutId);

				if (updateWorkoutError) {
					console.error('Error updating workout:', updateWorkoutError);
					alert('Failed to update workout.');
					setSaving(false);
					return;
				}

				// 2) Delete existing workout_exercises for that workout
				const { error: deleteError } = await supabase
					.from('workout_exercises')
					.delete()
					.eq('workout_id', editingWorkoutId);

				if (deleteError) {
					console.error('Error deleting existing workout exercises:', deleteError);
					alert('Failed to update exercises.');
					setSaving(false);
					return;
				}

				// 3) Insert the new set of workout_exercises
				const inserts = validExercises.map(ex => ({
					workout_id: editingWorkoutId,
					exercise_id: ex.exercise_id,
					sets: ex.sets,
					reps: ex.reps,
					weight: 0,
					order: ex.order
				}));

				const { error: insertError } = await supabase
					.from('workout_exercises')
					.insert(inserts);

				if (insertError) {
					console.error('Error inserting updated exercises:', insertError);
					alert('Failed to save updated exercises.');
					setSaving(false);
					return;
				}

				// Done — navigate back to the existing workout recap
				onNext(validExercises);
				navigate(`/workout/${editingWorkoutId}`);
				setSaving(false);
				return;
			}

			// -----------------------
			// CREATE NEW WORKOUT (existing logic)
			// -----------------------
			const { data: workoutData, error: workoutError } = await supabase
				.from('workouts')
				.insert([{ date: selectedDate, status: 'scheduled' }])
				.select()
				.single();

			if (workoutError || !workoutData) {
				console.error('Error creating workout:', workoutError);
				alert('Failed to create workout.');
				setSaving(false);
				return;
			}

			const workoutId = workoutData.id;

			const inserts = validExercises.map(ex => ({
				workout_id: workoutId,
				exercise_id: ex.exercise_id,
				sets: ex.sets,
				reps: ex.reps,
				weight: 0,
				order: ex.order
			}));

			const { error: insertError } = await supabase
				.from('workout_exercises')
				.insert(inserts);

			if (insertError) {
				console.error('Error saving exercises:', insertError);
				alert('Failed to save exercises.');
				setSaving(false);
				return;
			}

			onNext(validExercises);
			navigate(`/workout/${workoutId}`);
			setSaving(false);
		} catch (err) {
			console.error('Unexpected error saving workout:', err);
			alert('Something went wrong while saving.');
			setSaving(false);
		}
	};


  const handleSaveTemplate = async () => {
    if (!onSaveTemplate) return;
    setSaving(true);
    await onSaveTemplate(exercises);
    setSaving(false);
  };

  return (
    <div>
      <h1>🛠 Configure Circuit</h1>

      {!isEditingTemplate && (
        <>
          <label htmlFor="workout-date">Workout Date:</label>
          <input
            type="date"
            id="workout-date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ marginBottom: '1rem', marginLeft:'1rem', padding: '0.4rem' }}
          />
        </>
      )}

      <h2>📋 Exercises</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={exercises.map(e => e.exercise_id)}
          strategy={verticalListSortingStrategy}
        >
				{exercises.map((ex, i) => (
					<SortableExercise
						key={ex.exercise_id}
						ex={ex}
						index={i}
						onChange={handleChange}
						onRemove={handleRemoveExercise}
					/>
					))}
        </SortableContext>
      </DndContext>

      <br />

      <div style={{ display: 'flex', gap: '1rem' }}>
        {!isEditingTemplate && (
          <button
            onClick={handleSaveWorkout}
            disabled={saving}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            💾 Save Workout
          </button>
        )}

        {isEditingTemplate && (
          <button
            onClick={handleSaveTemplate}
            disabled={saving}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            📝 Save Template
          </button>
        )}
      </div>
    </div>
  );
}
