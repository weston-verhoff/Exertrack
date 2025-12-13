import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { deleteWorkoutById } from '../utils/deleteWorkout';
import { WorkoutButton } from './WorkoutButton';
import { WorkoutExercise, WorkoutSet } from '../types/workout';

interface Props {
  workoutId: string;
  date: string;
  status?: string;
  exercises: WorkoutExercise[];
  onDateChange: (date: string) => void;
  onSave: () => Promise<void>;
	onStatusChange: (status: string) => void;
	onExercisesChange: (exercises: WorkoutExercise[]) => void;
	onDelete: () => void;
}

export function WorkoutDetails({
  workoutId,
  date,
  status,
  exercises,
  onDateChange,
  onSave,
	onStatusChange,
	onExercisesChange,
	onDelete,
}: Props) {
  const navigate = useNavigate();

  /* ------------------ Derived Data ------------------ */

  const volumeByExercise = exercises.map(we => {
    const volume = we.workout_sets.reduce(
      (sum: number, s: WorkoutSet) => sum + s.reps * s.weight,
      0
    );

    return {
      name: we.exercise?.name ?? 'Unknown',
      sets: we.workout_sets.length,
      volume,
    };
  });

  const muscleSummary: Record<string, number> = {};
  exercises.forEach(we => {
    const muscle = we.exercise?.target_muscle ?? 'Unknown';
    const volume = we.workout_sets.reduce(
      (sum: number, s: WorkoutSet) => sum + s.reps * s.weight,
      0
    );
    muscleSummary[muscle] = (muscleSummary[muscle] || 0) + volume;
  });

  /* ------------------ Render ------------------ */

  return (
    <>
      <label style={{ display: 'block', marginBottom: '1rem' }}>
        <strong>Date:</strong>{' '}
        <input
          type="date"
          value={date}
          onChange={e => onDateChange(e.target.value)}
        />
      </label>

      <p><strong>Status:</strong> {status ?? 'completed'}</p>

      <h2>🏋️ Exercises</h2>

      {exercises.map(we => (
        <div key={we.id} className="exercise-item">
          <strong>{we.exercise?.name ?? 'Unknown'}</strong>

          <ul>
						{[...we.workout_sets]
							.sort((a, b) => a.set_number - b.set_number)
							.map(set => (
              <li key={set.id}>
                Set {set.set_number}:{' '}
                <input
                  type="number"
                  value={set.reps}
									onChange={e => {
									  const reps = Number(e.target.value);

									  onExercisesChange(
									    exercises.map(ex =>
									      ex.id !== we.id
									        ? ex
									        : {
									            ...ex,
									            workout_sets: ex.workout_sets.map(s =>
									              s.set_number === set.set_number
									                ? { ...s, reps }
									                : s
									            ),
									          }
									    )
									  );
									}}
                  style={{ width: 60 }}
                />
                reps @
                <input
                  type="number"
                  value={set.weight}
									onChange={e => {
									  const weight = Number(e.target.value);

									  onExercisesChange(
									    exercises.map(ex =>
									      ex.id !== we.id
									        ? ex
									        : {
									            ...ex,
									            workout_sets: ex.workout_sets.map(s =>
									              s.set_number === set.set_number
									                ? { ...s, weight }
									                : s
									            ),
									          }
									    )
									  );
									}}
                  style={{ width: 70, marginLeft: 6 }}
                />
                lbs
              </li>
            ))}
          </ul>
        </div>
      ))}

      <WorkoutButton
        label="Save Changes"
        icon="💾"
        variant="info"
        onClick={onSave}
      />

      <hr style={{ margin: '2rem 0' }} />

      <h2>📊 Volume Summary</h2>
      <ul>
        {volumeByExercise.map((ve, i) => (
          <li key={i}>
            {ve.name}: {ve.sets} sets → Volume: {ve.volume}
          </li>
        ))}
      </ul>

      <h2>🧠 Muscle Volume Breakdown</h2>
      <ul>
        {Object.entries(muscleSummary).map(([muscle, vol]) => (
          <li key={muscle}>
            {muscle}: {vol}
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
        {status !== 'completed' && (
          <>
            <WorkoutButton
              label="Start Workout"
              variant="info"
              onClick={() => navigate(`/runner/${workoutId}`)}
            />
						<WorkoutButton
						  label="Mark Completed"
						  icon="✅"
						  variant="info"
						  onClick={async () => {
						    const { error } = await supabase
						      .from('workouts')
						      .update({ status: 'completed' })
						      .eq('id', workoutId);

						    if (error) {
						      console.error(error);
						      alert('Failed to mark workout as completed.');
						      return;
						    }

						    // ✅ Update UI immediately
						    onStatusChange('completed');
						  }}
						/>
          </>
        )}

				{status !== 'scheduled' && (
					<>
					<WorkoutButton
						label="Move to Scheduled"
						icon="✅"
						variant="info"
						onClick={async () => {
							const { error } = await supabase
								.from('workouts')
								.update({ status: 'scheduled' })
								.eq('id', workoutId);

							if (error) {
								console.error(error);
								alert('Failed to mark workout as scheduled.');
								return;
							}

							// ✅ Update UI immediately
							onStatusChange('scheduled');
						}}
					/>
					</>
				)}

        <WorkoutButton
          label="Edit Workout"
          icon="✏️"
          variant="info"
          onClick={() => navigate(`/plan?importWorkout=${workoutId}`)}
        />

        <WorkoutButton
          label="Create Template"
          icon="📦"
          variant="info"
          onClick={async () => {
            const name = window.prompt('Name your template:');
            if (!name) return;

            const { data: template } = await supabase
              .from('templates')
              .insert({
                name,
                source_workout_id: workoutId,
                created_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (!template) return;

            for (const we of exercises) {
              await supabase.from('template_exercises').insert({
                template_id: template.id,
                exercise_id: we.exercise?.id,
                order: we.order,
                sets: we.workout_sets.length,
                reps: we.workout_sets[0]?.reps ?? 8,
              });
            }

            navigate('/templates');
          }}
        />

        <WorkoutButton
          label="Delete Workout"
          icon="X"
          variant="accent"
          onClick={async () => {
            if (!window.confirm('Delete this workout?')) return;
            onDelete();
          }}
        />
      </div>
    </>
  );
}
