import { useNavigate } from 'react-router-dom';
import '../styles/drawer.css';
import { WorkoutButton } from './WorkoutButton';
import { supabase } from '../supabase/client'
import { WorkoutExercise, WorkoutSet } from '../types/workout';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, type CSSProperties } from 'react'
import {
	deleteWorkoutSet,
  duplicateWorkoutFromExercises,
  updateWorkoutStatus,
	updateWorkoutSetCompletion,
	insertWorkoutSet,
} from '../services/workoutService';
import { BuilderExerciseConfig } from '../types/workoutBuilder';
import { getAccountSettings } from '../services/accountService';
import { getDefaultDistanceUnit, getWeightUnitLabel } from '../utils/unitPreferences';
import { useSystemAlerts } from '../context/SystemAlertContext';
import {
  BarChart3,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Copy,
  Dumbbell,
  Minus,
  PackagePlus,
  Pencil,
  Save,
  Timer,
  Trash2,
} from 'lucide-react';

interface Props {
  workoutId: string;
  date: string;
  status?: string;
  exercises: WorkoutExercise[];
  onDateChange: (date: string) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  statusMessage?: string | null;
  errorMessage?: string | null;
	onStatusChange: (status: string) => void;
	onExercisesChange: (exercises: WorkoutExercise[]) => void;
	onPersistedExercisesChange?: (exercises: WorkoutExercise[]) => void;
	onDelete: () => void;
	onClose?: () => void;
	fullPage?: boolean;
}

type NumericInputProps = {
  value: number;
  onChange: (value: number) => void;
	style?: CSSProperties;
};

function NumericInput({ value, onChange, style }: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(String(value));

  useEffect(() => {
    if (displayValue === '' && value === 0) return;
    const next = String(value);
    if (displayValue !== next) {
      setDisplayValue(next);
    }
  }, [displayValue, value]);

  return (
    <input
      className="workout-details__numeric-input"
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={e => {
        const value = e.target.value;
        setDisplayValue(value);
        const numeric = value === '' ? 0 : Number(value);
        onChange(Number.isNaN(numeric) ? 0 : numeric);
      }}
      style={style}
    />
  );
}

export function WorkoutDetails({
  workoutId,
  date,
  status,
  exercises,
  onDateChange,
  onSave,
  isSaving,
  statusMessage,
  errorMessage,
	onStatusChange,
	onExercisesChange,
	onPersistedExercisesChange,
	onDelete,
	onClose,
	fullPage = false,
}: Props) {
  const navigate = useNavigate();
	const { showAlert } = useSystemAlerts();
	const { user, userId, loading: authLoading } = useAuth();
	const accountSettings = user ? getAccountSettings(user) : null;
	const fallbackDistanceUnit = getDefaultDistanceUnit(
		accountSettings?.distanceSystem ?? 'imperial'
	);
	const weightUnitLabel = getWeightUnitLabel(
		accountSettings?.weightSystem ?? 'imperial'
	);
	const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
	const [removingSetId, setRemovingSetId] = useState<string | null>(null);
	const [addingSetId, setAddingSetId] = useState<string | null>(null);
	const [updatingCompletionSetId, setUpdatingCompletionSetId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
	const toBuilderExercises = (items: WorkoutExercise[]): BuilderExerciseConfig[] =>
    items.map((we, index) => ({
      id: `dup-${we.id}-${index}`,
      exercise_id: we.exercise?.id ?? we.exercise_id,
      name: we.exercise?.name ?? '',
      target_muscle: we.exercise?.target_muscle ?? '',
      exercise_type: we.exercise?.exercise_type ?? 'strength',
      track_laps: Boolean(we.exercise?.track_laps),
      order: we.order ?? index,
      sets: we.workout_sets.map(set => ({
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        intensity_type: set.intensity_type,
        notes: set.notes,
        duration_seconds: set.duration_seconds,
        distance_value: set.distance_value,
        distance_unit: set.distance_unit,
        calories: set.calories,
        average_heart_rate: set.average_heart_rate,
        resistance: set.resistance,
        incline: set.incline,
      })),
    }));

  /* ------------------ Derived Data ------------------ */
	const getNextSetNumber = (sets: WorkoutSet[]) =>
			sets.length > 0 ? Math.max(...sets.map(set => set.set_number)) + 1 : 1;
	const renumberSets = (sets: WorkoutSet[]) =>
		sets.map((set, index) => ({
			...set,
			set_number: index + 1,
	}));


  const strengthExercises = exercises.filter(
    we => we.exercise?.exercise_type === 'strength'
  );
  const cardioExercises = exercises.filter(
    we => we.exercise?.exercise_type === 'cardio'
  );

  const volumeByExercise = strengthExercises.map(we => {
    const volume = we.workout_sets.reduce(
      (sum: number, s: WorkoutSet) => sum + Number(s.reps ?? 0) * Number(s.weight ?? 0),
      0
    );

    return {
      name: we.exercise?.name ?? 'Unknown',
      sets: we.workout_sets.length,
      volume,
    };
  });

  const muscleSummary: Record<string, number> = {};
  strengthExercises.forEach(we => {
    const muscle = we.exercise?.target_muscle ?? 'Unknown';
    const volume = we.workout_sets.reduce(
      (sum: number, s: WorkoutSet) => sum + Number(s.reps ?? 0) * Number(s.weight ?? 0),
      0
    );
    muscleSummary[muscle] = (muscleSummary[muscle] || 0) + volume;
  });

  const cardioVolume = cardioExercises.map(we => {
    const durationSeconds = we.workout_sets.reduce(
      (sum, set) => sum + Number(set.duration_seconds ?? 0),
      0
    );

    return {
      name: we.exercise?.name ?? 'Unknown',
      muscle: we.exercise?.target_muscle ?? 'Unknown',
      minutes: Math.round(durationSeconds / 60),
    };
  });

  /* ------------------ Render ------------------ */

  return (
    <div className={`workout-details${fullPage ? ' workout-details--full-page' : ''}`}>
      <header className="workout-details__header">
      <label className="workout-details__date">
        <span>Date</span>
        <input
          type="date"
          value={date}
          onChange={e => onDateChange(e.target.value)}
        />
      </label>

      <div className="workout-details__status">
        <span>Status</span>
        <strong>{status ?? 'completed'}</strong>
      </div>
      </header>

      <section className="workout-details__section">
      <h2 className="workout-details__section-title">
        <Dumbbell aria-hidden="true" size={24} /> Exercises
      </h2>

      {exercises.map(we => {
        const isCardio = we.exercise?.exercise_type === 'cardio';
        const tracksLaps = isCardio && Boolean(we.exercise?.track_laps);

        return (
		<div key={we.id} className="exercise-item">
          <strong>{we.exercise?.name ?? 'Unknown'}</strong>
					{(!isCardio || tracksLaps) && (
					<WorkoutButton
					  label={addingSetId === we.id ? 'Adding...' : isCardio ? 'Add Segment' : 'Add Set'}
					  icon=""
					  variant="unsetText"
					  onClick={async () => {
					    if (authLoading || !userId) return;
					    const nextSetNumber = getNextSetNumber(we.workout_sets);
					    setAddingSetId(we.id);
					    const { data, error } = await insertWorkoutSet({
					      workoutExerciseId: we.id,
					      setNumber: nextSetNumber,
					      reps: isCardio ? null : 8,
					      weight: isCardio ? null : 0,
					      durationSeconds: isCardio ? 1800 : null,
					      distanceUnit: isCardio
					        ? we.workout_sets[0]?.distance_unit ??
					          we.exercise?.default_distance_unit ??
					          fallbackDistanceUnit
					        : null,
					      intensityType: 'normal',
					    });

					    if (error || !data) {
					      console.error(error);
					      showAlert('Failed to add set.', { tone: 'error' });
					      setAddingSetId(null);
					      return;
					    }

					    onExercisesChange(
					      exercises.map(ex =>
					        ex.id !== we.id
					          ? ex
					          : {
					              ...ex,
					              workout_sets: [...ex.workout_sets, data],
					            }
					      )
					    );
					    setAddingSetId(null);
					  }}
					  disabled={addingSetId === we.id}
					/>
					)}


          <ul>
						{[...we.workout_sets]
							.sort((a, b) => a.set_number - b.set_number)
							.map(set => (
								<li
								  key={set.id ?? `${we.id}-${set.set_number}`}
								  className={set.completed ? 'exercise-set-row exercise-set-row--completed' : 'exercise-set-row'}
								>
								<button
								  type="button"
								  className="exercise-set-completion"
								  aria-label={`${set.completed ? 'Mark incomplete' : 'Mark completed'} ${isCardio ? 'segment' : 'set'} ${set.set_number}`}
								  aria-pressed={Boolean(set.completed)}
								  title={set.completed ? 'Mark incomplete' : 'Mark completed'}
								  disabled={!set.id || updatingCompletionSetId !== null}
								  onClick={async () => {
								    if (!set.id || authLoading || !userId) return;
								    const completed = !set.completed;
								    setUpdatingCompletionSetId(set.id);
								    const { error } = await updateWorkoutSetCompletion({
								      setId: set.id,
								      completed,
								    });

								    if (error) {
								      console.error(error);
								      showAlert(`Failed to mark ${isCardio ? 'segment' : 'set'} ${completed ? 'completed' : 'incomplete'}.`, { tone: 'error' });
								      setUpdatingCompletionSetId(null);
								      return;
								    }

								    const updatedExercises = exercises.map(ex =>
								        ex.id !== we.id
								          ? ex
								          : {
								              ...ex,
								              workout_sets: ex.workout_sets.map(s =>
								                s.id === set.id ? { ...s, completed } : s
								              ),
								            }
								      );
								    onExercisesChange(updatedExercises);
								    onPersistedExercisesChange?.(updatedExercises);
								    setUpdatingCompletionSetId(null);
								  }}
								>
								  {set.completed ? '✓' : ''}
								</button>
				{isCardio ? <>
				{tracksLaps && <>Segment {set.set_number}:{' '}</>}
				<NumericInput value={Math.round((set.duration_seconds ?? 0) / 60)} onChange={value => onExercisesChange(exercises.map(ex => ex.id !== we.id ? ex : ({ ...ex, workout_sets: ex.workout_sets.map(s => s.set_number === set.set_number ? { ...s, duration_seconds: Math.max(0, value) * 60 } : s) })))} style={{ width: 60 }} /> min{' '}
				<NumericInput value={set.distance_value ?? 0} onChange={value => onExercisesChange(exercises.map(ex => ex.id !== we.id ? ex : ({ ...ex, workout_sets: ex.workout_sets.map(s => s.set_number === set.set_number ? { ...s, distance_value: Math.max(0, value) } : s) })))} style={{ width: 70 }} />{' '}
				<span aria-label="Distance unit">
				  {set.distance_unit ?? we.exercise?.default_distance_unit ?? fallbackDistanceUnit}
				</span>
				</> : <>
                Set {set.set_number}:{' '}
								<NumericInput
                  value={set.reps ?? 0}
                  onChange={value => {
                    onExercisesChange(
                      exercises.map(ex =>
                        ex.id !== we.id
                          ? ex
                          : {
                              ...ex,
                              workout_sets: ex.workout_sets.map(s =>
                                s.set_number === set.set_number
                                  ? { ...s, reps: value }
                                  : s
                              ),
                            }
                      )
                    );
                  }}
                  style={{ width: 60 }}
                />
                reps
								<NumericInput
                  value={set.weight ?? 0}
                  onChange={value => {
                    onExercisesChange(
                      exercises.map(ex =>
                        ex.id !== we.id
                          ? ex
                          : {
                              ...ex,
                              workout_sets: ex.workout_sets.map(s =>
                                s.set_number === set.set_number
                                  ? { ...s, weight: value }
                                  : s
                              ),
                            }
                      )
                    );
                  }}
                  style={{ width: 70, marginLeft: 6 }}
                />
	                {weightUnitLabel.toLocaleLowerCase()}
				</>}
								{(!isCardio || tracksLaps) && (
									<button
									  type="button"
									  onClick={async () => {
									    const setId = set.id;
									    setRemovingSetId(setId ?? `${we.id}-${set.set_number}`);
									    if (setId) {
									      const { error } = await deleteWorkoutSet({ setId });
									      if (error) {
									        console.error(error);
									        showAlert('Failed to remove set.', { tone: 'error' });
									        setRemovingSetId(null);
									        return;
									      }
									    }

									    onExercisesChange(
									      exercises.map(ex =>
									        ex.id !== we.id
									          ? ex
									          : {
									              ...ex,
									              workout_sets: renumberSets(
									                ex.workout_sets.filter(s =>
									                  setId
									                    ? s.id !== setId
									                    : s.set_number !== set.set_number
									                )
									              ),
									            }
									      )
									    );
									    setRemovingSetId(null);
									  }}
									  disabled={
									    removingSetId ===
									    (set.id ?? `${we.id}-${set.set_number}`)
									  }
									  aria-label={`Remove ${isCardio ? 'segment' : 'set'} ${set.set_number}`}
									  title={`Remove ${isCardio ? 'segment' : 'set'}`}
									  style={{
									    marginLeft: 'auto',
									    width: 18,
									    height: 18,
									    borderRadius: '50%',
									    border: 'none',
									    backgroundColor: 'var(--color-interactive-danger)',
									    color: 'var(--color-on-interactive-danger)',
									    fontSize: 12,
									    display: 'inline-grid',
									    placeItems: 'center',
									    padding: 0,
									    cursor: 'pointer',
									  }}
									>
									  <Minus aria-hidden="true" size={12} />
									</button>
								)}
	              </li>
	            ))}
	          </ul>
	        </div>
	        );
	      })}

	      <div className="workout-details__save">
	      <WorkoutButton
	        label={isSaving ? 'Saving...' : 'Save Changes'}
	        icon={<Save size={18} />}
	        variant="primary"
	        onClick={onSave}
	        disabled={isSaving}
	        data-testid="save-workout"
	      />
	      </div>

				{statusMessage && (
        <p style={{ marginTop: '0.5rem', color: 'inherit' }}>
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p style={{ marginTop: '0.5rem', color: 'var(--color-on-inverse-danger)' }}>
          {errorMessage}
        </p>
      )}
		</section>

			{duplicateMessage && (
        <p className="workout-details__message" style={{ marginTop: '0.5rem', color: 'inherit' }}>
          {duplicateMessage}
        </p>
      )}
      {duplicateError && (
        <p className="workout-details__message" style={{ marginTop: '0.5rem', color: 'var(--color-on-inverse-danger)' }}>
          {duplicateError}
        </p>
      )}

        <div className="workout-details__summaries">
        {strengthExercises.length > 0 && (
        <section className="workout-details__section">
	      <h2 className="workout-details__section-title">
          <Brain aria-hidden="true" size={24} /> Muscle Volume Breakdown
        </h2>
	      <ul>
	        {Object.entries(muscleSummary).map(([muscle, vol]) => (
	          <li key={muscle}>
	            {muscle}: {vol}
	          </li>
	        ))}
	      </ul>
        </section>
        )}

        {strengthExercises.length > 0 && (
        <section className="workout-details__section">
	      <h2 className="workout-details__section-title">
          <BarChart3 aria-hidden="true" size={24} /> Volume Summary
        </h2>
	      <ul>
	        {volumeByExercise.map((ve, i) => (
	          <li key={i}>
	            {ve.name}: {ve.sets} sets → Volume: {ve.volume}
	          </li>
	        ))}
	      </ul>
        </section>
        )}

        {cardioExercises.length > 0 && (
        <section className="workout-details__section">
	      <h2 className="workout-details__section-title">
          <Timer aria-hidden="true" size={24} /> Cardio Volume
        </h2>
	      <ul>
	        {cardioVolume.map((entry, index) => (
	          <li key={`${entry.name}-${index}`}>
	            {entry.name}: {entry.muscle} → Volume: {entry.minutes}{' '}
              {entry.minutes === 1 ? 'minute' : 'minutes'}
	          </li>
	        ))}
	      </ul>
        </section>
        )}
        </div>

	      <div className="workout-details__actions">
	        {status !== 'completed' && (
	          <>
	            <WorkoutButton
	              label="Start Workout"
              variant="primary"
              onClick={() => navigate(`/runner/${workoutId}`)}
            />
						<WorkoutButton
						  label="Mark Completed"
						  icon={<CheckCircle2 size={18} />}
						  variant="secondary"
						  onClick={async () => {
								if (authLoading || !userId) return;
								const { error } = await updateWorkoutStatus({
                  workoutId,
                  userId,
                  status: 'completed',
                });
						    if (error) {
						      console.error(error);
						      showAlert('Failed to mark workout as completed.', { tone: 'error' });
						      return;
						    }

						    // ✅ Update UI immediately
						    onStatusChange('completed');
								onClose?.();
						  }}
						/>
          </>
        )}

				{status !== 'scheduled' && (
					<>
					<WorkoutButton
						  label="Move to Scheduled"
						  icon={<CalendarCheck size={18} />}
						  variant="secondary"
						  onClick={async () => {
              if (authLoading || !userId) return;
							const { error } = await updateWorkoutStatus({
                workoutId,
                userId,
                status: 'scheduled',
              });

							if (error) {
								console.error(error);
								showAlert('Failed to mark workout as scheduled.', { tone: 'error' });
								return;
							}

							// ✅ Update UI immediately
							onStatusChange('scheduled');
							onClose?.();
						}}
					/>
					</>
				)}

        <WorkoutButton
          label="Edit Workout"
          icon={<Pencil size={18} />}
          variant="secondary"
          onClick={() => navigate(`/plan?importWorkout=${workoutId}`)}
        />
				<WorkoutButton
          label={isDuplicating ? 'Duplicating...' : 'Duplicate Workout'}
          icon={<Copy size={18} />}
          variant="secondary"
          onClick={async () => {
            if (authLoading || !userId) return;
            setIsDuplicating(true);
            setDuplicateMessage(null);
            setDuplicateError(null);
            try {
              const duplicateDate = new Date().toISOString().split('T')[0];
							const builderExercises = toBuilderExercises(exercises);
              const { data, error } = await duplicateWorkoutFromExercises({
                userId,
                exercises: builderExercises,
                date: duplicateDate,
              });

							if (error || !data) {
                throw new Error(error ?? 'Failed to duplicate workout.');
              }

              setDuplicateMessage('Workout duplicated! Redirecting...');
              navigate(`/workout/${data.id}`);
            } catch (error) {
              console.error('Failed to duplicate workout:', error);
              setDuplicateError('Failed to duplicate workout.');
            } finally {
              setIsDuplicating(false);
            }
          }}
          disabled={isDuplicating}
        />

        <WorkoutButton
          label="Create Template"
          icon={<PackagePlus size={18} />}
          variant="secondary"
          onClick={async () => {
            const name = window.prompt('Name your template:');
            if (!name) return;

						if (authLoading || !userId) return;

            const { data: template } = await supabase
              .from('templates')
              .insert({
                name,
                source_workout_id: workoutId,
                created_at: new Date().toISOString(),
								user_id: userId,
              })
              .select()
              .single();

            if (!template) return;

						const inserts = exercises
						  .map(we => {
						    const exerciseId = we.exercise?.id ?? we.exercise_id;

								if (!exerciseId) {
								  console.warn('Skipping exercise with missing exercise identifier', we);
								  return null;
								}

						    return {
						      template_id: template.id,
						      exercise_id: exerciseId, // 🔑 CORRECT SOURCE
						      order: we.order,
						      sets: we.workout_sets.length,
						      reps: we.workout_sets[0]?.reps ?? 8,
						    };
						  })
							.filter((row): row is NonNullable<typeof row> => row !== null);

						if (inserts.length === 0) {
						  showAlert('No exercises were available to add to the template.', { tone: 'error' });
							return;
						}

						const { error: templateExerciseError } = await supabase
						  .from('template_exercises')
						  .insert(inserts);

						if (templateExerciseError) {
						  console.error(templateExerciseError);
						  showAlert('Failed to add exercises to the template.', { tone: 'error' });
						  return;
						}

            navigate('/templates');
          }}
        />

        <WorkoutButton
          label="Delete Workout"
          icon={<Trash2 size={18} />}
          variant="destructive"
          onClick={async () => {
            onDelete();
          }}
        />
      </div>
    </div>
  );
}
