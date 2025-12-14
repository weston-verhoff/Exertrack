import React, { useEffect, useState } from 'react';
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

export interface ExerciseConfig {
	id:string;
  exercise_id: string;
  name: string;
  sets: WorkoutSet[];
  order: number;
}

export interface WorkoutSet {
  set_number: number;
  reps: number;
  weight: number;
  intensity_type?: string;
  notes?: string;
}

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
    id:ex.id
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
        icon="X"
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
				  value={ex.sets.length}
				  onChange={e => {
				    const count = Math.max(0, Number(e.target.value));
				    onChange(index, 'sets', count);
				  }}
				  style={{ width: '56px' }}
				/>
				<input
				  type="number"
				  placeholder="Reps"
				  value={ex.sets[0]?.reps ?? 0}
				  onChange={e => {
				    const reps = Math.max(0, Number(e.target.value));
				    onChange(index, 'reps', reps);
				  }}
				  style={{ width: '56px' }}
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
  // initialize as empty, then sync from prop
	const [exercises, setExercises] = useState<ExerciseConfig[]>(() =>
	  Array.isArray(selectedExercises)
	    ? selectedExercises.map((ex, i) => ({
					id: ex.id,
	        exercise_id: ex.exercise_id,
	        name: ex.name ?? '',
	        order: typeof ex.order === 'number' ? ex.order : i,
	        sets: Array.isArray(ex.sets)
	          ? ex.sets
	          : [
	              {
	                set_number: 1,
	                reps: 8,
	                weight: 0,
	                intensity_type: 'normal',
	              },
	            ],
	      }))
	    : []
	);
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const sensors = useSensors(useSensor(PointerSensor));

  // Sync prop -> internal state whenever selectedExercises changes
  useEffect(() => {
		console.log('[STEP2] exercises:', exercises);
    if (!Array.isArray(selectedExercises)) {
      setExercises([]);
      return;
    }


		const synced: ExerciseConfig[] = selectedExercises.map((ex, i) => ({
			id: ex.id,
		  exercise_id: ex.exercise_id,
		  name: ex.name ?? '',
		  order: typeof ex.order === 'number' ? ex.order : i,
		  sets: Array.isArray(ex.sets)
		    ? ex.sets
		    : [
		        {
		          set_number: 1,
		          reps: 8,
		          weight: 0,
		          intensity_type: 'normal',
		        },
		      ],
		}));

    setExercises(synced);
  }, [selectedExercises]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exercises.findIndex(e => e.id === active.id);
    const newIndex = exercises.findIndex(e => e.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(exercises, oldIndex, newIndex).map((ex, i) => ({
      ...ex,
      order: i
    }));

    setExercises(reordered);
  };

	const handleChange = (
	  index: number,
	  field: 'sets' | 'reps',
	  value: number
	) => {
	  const updated = [...exercises];
	  const ex = updated[index];

	  if (field === 'sets') {
	    const current = ex.sets.length;

	    if (value > current) {
	      ex.sets.push(
	        ...Array.from({ length: value - current }, (_, i) => ({
	          set_number: current + i + 1,
	          reps: ex.sets[0]?.reps ?? 8,
	          weight: ex.sets[0]?.weight ?? 0,
	          intensity_type: 'normal',
	        }))
	      );
	    } else {
	      ex.sets = ex.sets.slice(0, value);
	    }
	  }

	  if (field === 'reps') {
	    ex.sets = ex.sets.map(s => ({ ...s, reps: value }));
	  }

	  setExercises(updated);
	};

  const handleRemoveExercise = (exercise_id: string) => {
    const updated = exercises
      .filter(e => e.exercise_id !== exercise_id)
      .map((e, i) => ({ ...e, order: i }));
    setExercises(updated);
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
				// 1️⃣ Delete existing exercises (sets will cascade if FK is set)
				await supabase
				  .from('workout_exercises')
				  .delete()
				  .eq('workout_id', editingWorkoutId);

				// 2️⃣ Recreate exercises + sets
				for (const ex of validExercises) {
				  // Create workout_exercise
				  const { data: we, error: weError } = await supabase
				    .from('workout_exercises')
						.insert({
						  workout_id: editingWorkoutId,
						  exercise_id: ex.exercise_id,
						  order: ex.order,
						  sets: ex.sets.length,
						  reps: ex.sets[0]?.reps ?? 0,
						  weight: ex.sets[0]?.weight ?? 0,
						})
				    .select()
				    .single();

				  if (weError || !we) {
				    console.error(weError);
				    throw weError;
				  }

				  // Create workout_sets
				  const setRows = ex.sets.map(set => ({
				    workout_exercise_id: we.id,
				    set_number: set.set_number,
				    reps: set.reps,
				    weight: set.weight,
				    intensity_type: set.intensity_type ?? 'normal',
				    notes: set.notes ?? null,
				  }));

				  const { error: setsError } = await supabase
				    .from('workout_sets')
				    .insert(setRows);

				  if (setsError) {
				    console.error(setsError);
				    throw setsError;
				  }
				}

				navigate(`/workout/${editingWorkoutId}`);
				setSaving(false);
				return;
      }

      // Create new workout
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

			for (const ex of validExercises) {
			  const { data: we, error: weError } = await supabase
			    .from('workout_exercises')
					.insert({
					  workout_id: workoutId,
					  exercise_id: ex.exercise_id,
					  order: ex.order,
					  sets: ex.sets.length,
					  reps: ex.sets[0]?.reps ?? 0,
					  weight: ex.sets[0]?.weight ?? 0,
					})
			    .select()
			    .single();

			  if (weError || !we) {
			    console.error(weError);
			    throw weError;
			  }

			  const setRows = ex.sets.map(set => ({
			    workout_exercise_id: we.id,
			    set_number: set.set_number,
			    reps: set.reps,
			    weight: set.weight,
			    intensity_type: set.intensity_type ?? 'normal',
			    notes: set.notes ?? null,
			  }));

			  const { error: setsError } = await supabase
			    .from('workout_sets')
			    .insert(setRows);

			  if (setsError) {
			    console.error(setsError);
			    throw setsError;
			  }
			}

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
          items={exercises.map(e => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {exercises.map((ex, i) => (
            <SortableExercise
              key={ex.id}
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
          <WorkoutButton
            label="Save Template"
            icon=""
            variant="info"
            onClick={handleSaveTemplate}
          />
        )}
      </div>
    </div>
  );
}
