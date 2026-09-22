import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useExercises } from '../hooks/useExercises';
import { useTemplates } from '../hooks/useTemplates';
import { supabase } from '../supabase/client';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getAccountSettings } from '../services/accountService';
import { Drawer } from '../components/Drawer';
import { WorkoutButton } from '../components/WorkoutButton';
import { SwitchField } from '../components/SwitchField';
import { ExerciseChip } from '../components/ExerciseChip';
import { GripVertical, Plus, Search, X } from 'lucide-react';
import '../styles/plan.css';
import '../styles/metric-fields.css';
import { BuilderExerciseConfig } from '../types/workoutBuilder';
import { DistanceUnit, ExerciseType } from '../types/workout';
import { useSystemAlerts } from '../context/SystemAlertContext';
import {
  createWorkoutFromBuilder,
  fetchTemplateBuilderExercises,
  fetchWorkoutBuilderExercises,
  updateWorkoutFromBuilder,
} from '../services/workoutService';
import {
  getDefaultDistanceUnit,
  getDistanceUnitOptions,
  getWeightUnitLabel,
  normalizeDistanceUnit,
} from '../utils/unitPreferences';

type BuilderField = 'sets' | 'reps' | 'weight' | 'duration_seconds' | 'distance_value';

type BuilderRowProps = {
  exercise: BuilderExerciseConfig;
  weightUnitLabel: string;
  onChange: (
    id: string,
    field: BuilderField,
    value: number
  ) => void;
  onRemove: (exerciseId: string, configId: string) => void;
};

type BuilderNumberInputProps = {
  value: number;
  onChange: (value: number) => void;
};

function BuilderNumberInput({ value, onChange }: BuilderNumberInputProps) {
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
      className="metric-field__control"
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={e => {
        const rawValue = e.target.value;
        setDisplayValue(rawValue);
        const numeric = rawValue === '' ? 0 : Number(rawValue);
        onChange(Number.isNaN(numeric) ? 0 : numeric);
      }}
    />
  );
}

export function BuilderRow({
  exercise,
  weightUnitLabel,
  onChange,
  onRemove,
}: BuilderRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: exercise.id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
      <div ref={setNodeRef} style={style} className="builder-row">
      <span className="drag-handle" {...attributes} {...listeners}>
        <GripVertical aria-hidden="true" size={22} />
      </span>
      

      <div className="builder-row__info">
        <div className="builder-row__name">{exercise.name}</div>
        <div className="builder-row__muscle">
          {exercise.target_muscle ?? 'Full Body'}
        </div>
      </div>

      <div className="builder-row__stats">
        {(exercise.exercise_type === 'strength' || exercise.track_laps) && (
          <label className="stat-field metric-field">
            <BuilderNumberInput
              value={exercise.sets.length}
              onChange={value => onChange(exercise.id, 'sets', value)}
            />
            <span className="stat-label metric-field__label">{exercise.exercise_type === 'cardio' ? 'LAPS' : 'SETS'}</span>
          </label>
        )}
        {exercise.exercise_type === 'cardio' ? <>
        <label className="stat-field metric-field">
          <BuilderNumberInput value={Math.round((exercise.sets[0]?.duration_seconds ?? 0) / 60)} onChange={value => onChange(exercise.id, 'duration_seconds', value * 60)} />
          <span className="stat-label metric-field__label">MIN</span>
        </label>
        <label className="stat-field metric-field">
          <BuilderNumberInput value={exercise.sets[0]?.distance_value ?? 0} onChange={value => onChange(exercise.id, 'distance_value', value)} />
          <span className="stat-label metric-field__label">
            DIST ({(exercise.sets[0]?.distance_unit ?? 'mi').toUpperCase()})
          </span>
        </label>
        </> : <>
        <label className="stat-field metric-field">
          <BuilderNumberInput
            value={exercise.sets[0]?.reps ?? 0}
            onChange={value => onChange(exercise.id, 'reps', value)}
          />
          <span className="stat-label metric-field__label">REPS</span>
        </label>
        <label className="stat-field metric-field">
          <BuilderNumberInput
            value={exercise.sets[0]?.weight ?? 0}
            onChange={value => onChange(exercise.id, 'weight', value)}
          />
          <span className="stat-label metric-field__label">{weightUnitLabel}</span>
        </label>
        </>}
      </div>
      <button
        className="remove-chip"
        onClick={() => onRemove(exercise.exercise_id, exercise.id)}
        aria-label={`Remove ${exercise.name}`}
      >
        <X aria-hidden="true" size={20} />
      </button>
    </div>
  );
}

export default function PlanSession() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
	const {
    exercises,
    loading: loadingExercises,
    refetch,
    addExercise,
  } = useExercises();
  const { templates, loading: loadingTemplates } = useTemplates();
  const { user, userId, loading: authLoading } = useAuth();
  const accountSettings = user ? getAccountSettings(user) : null;
  const distanceSystem = accountSettings?.distanceSystem ?? 'imperial';
  const weightUnitLabel = getWeightUnitLabel(accountSettings?.weightSystem ?? 'imperial');
  const defaultDistanceUnit = getDefaultDistanceUnit(distanceSystem);

  const queryTemplateId = searchParams.get('importTemplate');
  const queryWorkoutId = searchParams.get('importWorkout');
  const editTemplateId = searchParams.get('editTemplate');
  const isEditingTemplate = editTemplateId !== null;
  const editingWorkoutId = queryWorkoutId ?? undefined;
  const activeTemplateId = editTemplateId ?? queryTemplateId ?? undefined;
  const isEditingWorkout = Boolean(editingWorkoutId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [selectedExercisesData, setSelectedExercisesData] = useState<
    BuilderExerciseConfig[]
  >([]);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState('');
  const [customExerciseType, setCustomExerciseType] = useState<ExerciseType>('strength');
  const [customDistanceUnit, setCustomDistanceUnit] = useState<DistanceUnit>('mi');
  const [customTrackLaps, setCustomTrackLaps] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastImportedKey, setLastImportedKey] = useState<string | null>(null);
  const { dismissAlertGroup, showAlert } = useSystemAlerts();

  useEffect(() => {
    if (!statusMessage) return;
    const tone = /saved|updated/i.test(statusMessage) ? 'success' : 'info';
    showAlert(statusMessage, { tone, replaceKey: 'plan-save' });
  }, [showAlert, statusMessage]);

  useEffect(() => {
    if (!errorMessage) return;
    dismissAlertGroup('plan-save');
    showAlert(errorMessage, { tone: 'error' });
  }, [dismissAlertGroup, errorMessage, showAlert]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    setCustomDistanceUnit(current => normalizeDistanceUnit(current, distanceSystem));
  }, [distanceSystem]);

  const importKey = useMemo(() => {
    if (queryTemplateId) return `template:${queryTemplateId}`;
    if (queryWorkoutId) return `workout:${queryWorkoutId}`;
		if (editTemplateId) return `template:${editTemplateId}`;
    return null;
  }, [queryTemplateId, queryWorkoutId, editTemplateId]);

  const filteredExercises = useMemo(
    () =>
      exercises.filter(
        e =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.target_muscle.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [exercises, searchQuery]
  );

  const availableExercises = useMemo(
    () =>
      filteredExercises.filter(
        exercise => !selectedExerciseIds.includes(exercise.id)
      ),
    [filteredExercises, selectedExerciseIds]
  );

  useEffect(() => {
    if (authLoading || !importKey || !userId) return;
    if (lastImportedKey === importKey) return;

    async function fetchImportedData() {
      try {
        let cleaned: BuilderExerciseConfig[] = [];
        let importedDate: string | null = null;

				const templateId = queryTemplateId ?? editTemplateId;

        if (templateId) {
          const { data, error } = await fetchTemplateBuilderExercises(
            templateId
          );
          if (error) throw new Error(error);
          cleaned = data ?? [];
        } else if (queryWorkoutId) {
          const { data, error } = await fetchWorkoutBuilderExercises(
            queryWorkoutId
          );
          if (error) throw new Error(error);
          cleaned = data?.exercises ?? [];
          importedDate = data?.date ?? null;
        }

        if (cleaned.length > 0) {
          const sorted = [...cleaned]
            .sort((a, b) => a.order - b.order)
            .map(exercise =>
              exercise.exercise_type === 'cardio'
                ? {
                    ...exercise,
                    sets: exercise.sets.map(set => ({
                      ...set,
                      distance_unit: normalizeDistanceUnit(
                        set.distance_unit,
                        distanceSystem
                      ),
                    })),
                  }
                : exercise
            );
          setSelectedExerciseIds(sorted.map(e => e.exercise_id));
          setSelectedExercisesData(sorted);
          setSelectedDate(
            importedDate ?? new Date().toISOString().split('T')[0]
          );
          setLastImportedKey(importKey);
        }
      } catch (err) {
        console.error('[IMPORT] Failed:', err);
      }
    }

    fetchImportedData();
  }, [
    authLoading,
    importKey,
    lastImportedKey,
    queryTemplateId,
    queryWorkoutId,
    userId,
		addExercise,
    editTemplateId,
    distanceSystem,
  ]);

  const toggleExercise = (exerciseId: string) => {
    const alreadySelected = selectedExerciseIds.includes(exerciseId);

    setSelectedExerciseIds(prev =>
      alreadySelected
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );

    setSelectedExercisesData(prev => {
      if (alreadySelected) {
        return prev
          .filter(ex => ex.exercise_id !== exerciseId)
          .map((ex, idx) => ({ ...ex, order: idx }));
      }

      const exercise = exercises.find(e => e.id === exerciseId);
      if (!exercise) return prev;

      const newExercise: BuilderExerciseConfig = {
        id: `manual-${exercise.id}-${Date.now()}`,
        exercise_id: exercise.id,
        name: exercise.name,
        target_muscle: exercise.target_muscle,
        exercise_type: exercise.exercise_type ?? 'strength',
        track_laps: Boolean(exercise.track_laps),
        order: prev.length,
        sets: Array.from({ length: exercise.exercise_type === 'cardio' ? 1 : 3 }, (_, idx) => ({
          set_number: idx + 1,
          reps: exercise.exercise_type === 'cardio' ? null : 8,
          weight: exercise.exercise_type === 'cardio' ? null : 0,
          duration_seconds: exercise.exercise_type === 'cardio' ? 1800 : null,
          distance_unit:
            exercise.exercise_type === 'cardio'
              ? normalizeDistanceUnit(
                  exercise.default_distance_unit,
                  distanceSystem
                )
              : null,
          intensity_type: 'normal',
        })),
      };

      return [...prev, newExercise];
    });
  };

  const handleChangeExercise = (
    id: string,
    field: BuilderField,
    value: number
  ) => {
    setSelectedExercisesData(prev =>
      prev.map(ex => {
        if (ex.id !== id) return ex;

        const nextSets = [...ex.sets];

        if (field === 'sets') {
          const count = Math.max(0, Number(value));
          if (count > nextSets.length) {
            nextSets.push(
              ...Array.from({ length: count - nextSets.length }, (_, idx) => ({
                set_number: nextSets.length + idx + 1,
                reps: nextSets[0]?.reps ?? 8,
                weight: nextSets[0]?.weight ?? 0,
                intensity_type: 'normal',
                duration_seconds: ex.exercise_type === 'cardio' ? nextSets[0]?.duration_seconds ?? 1800 : null,
                distance_value: ex.exercise_type === 'cardio' ? nextSets[0]?.distance_value ?? null : null,
                distance_unit:
                  ex.exercise_type === 'cardio'
                    ? normalizeDistanceUnit(
                        nextSets[0]?.distance_unit,
                        distanceSystem
                      )
                    : null,
                calories: ex.exercise_type === 'cardio' ? nextSets[0]?.calories ?? null : null,
              }))
            );
          } else {
            nextSets.splice(count);
          }
          nextSets.forEach((set, idx) => {
            set.set_number = idx + 1;
          });
        }

        if (field === 'reps') {
          const reps = Math.max(0, Number(value));
          nextSets.forEach(set => {
            set.reps = reps;
          });
        }

        if (field === 'weight') {
          const weight = Math.max(0, Number(value));
          nextSets.forEach(set => {
            set.weight = weight;
          });
        }

        if (field === 'duration_seconds' || field === 'distance_value') {
          nextSets.forEach(set => { set[field] = Math.max(0, Number(value)); });
        }
        return { ...ex, sets: nextSets };
      })
    );
  };

  const handleRemoveExercise = (exerciseId: string, configId: string) => {
    setSelectedExerciseIds(prev => prev.filter(id => id !== exerciseId));
    setSelectedExercisesData(prev =>
      prev
        .filter(ex => ex.id !== configId)
        .map((ex, idx) => ({ ...ex, order: idx }))
    );
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = selectedExercisesData.findIndex(ex => ex.id === active.id);
    const newIndex = selectedExercisesData.findIndex(ex => ex.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(selectedExercisesData, oldIndex, newIndex).map(
      (ex, idx) => ({ ...ex, order: idx })
    );
    setSelectedExercisesData(reordered);
  };

  const addCustomExercise = async () => {
    if (!userId) return;
    if (!customName || !customMuscle) return;

    const { data, error } = await supabase
      .from('exercises')
      .insert([
        {
          name: customName,
          target_muscle: customMuscle,
          is_custom: true,
          user_id: userId,
          exercise_type: customExerciseType,
          default_distance_unit:
            customExerciseType === 'cardio' ? customDistanceUnit : null,
          track_laps: customExerciseType === 'cardio' && customTrackLaps,
        },
      ])
      .select();

    if (error) {
      console.error('Error adding custom exercise:', error);
    } else if (data && data[0]) {
			const newExercise = data[0];
      addExercise(newExercise);
      setCustomName('');
      setCustomMuscle('');
      setCustomExerciseType('strength');
      setCustomDistanceUnit(defaultDistanceUnit);
      setCustomTrackLaps(false);
      setAddingCustom(false);
      await refetch();
    }
  };

	const closeCustomDrawer = () => {
    setAddingCustom(false);
  };

  const handleSaveTemplate = async (configured: BuilderExerciseConfig[]) => {
    if (!userId) {
      throw new Error('No authenticated user.');
    }
    if (!activeTemplateId) {
      throw new Error('No active template selected.');
    }

    const inserts = configured
      .filter(ex => !!ex.exercise_id)
      .map((ex, i) => ({
        template_id: activeTemplateId,
        exercise_id: ex.exercise_id,
        sets: ex.sets.length,
        reps: ex.sets[0]?.reps ?? 8,
        weight: ex.sets[0]?.weight ?? null,
        duration_seconds: ex.sets[0]?.duration_seconds ?? null,
        distance_value: ex.sets[0]?.distance_value ?? null,
        distance_unit: ex.sets[0]?.distance_unit ?? null,
        calories: ex.sets[0]?.calories ?? null,
        average_heart_rate: ex.sets[0]?.average_heart_rate ?? null,
        resistance: ex.sets[0]?.resistance ?? null,
        incline: ex.sets[0]?.incline ?? null,
        order: i,
      }));

    if (inserts.length === 0) {
      throw new Error('Add at least one valid exercise before saving.');
    }

    const { error: deleteError } = await supabase
      .from('template_exercises')
      .delete()
      .eq('template_id', activeTemplateId);

    if (deleteError) {
      console.error('Error clearing existing template exercises:', deleteError);
      throw deleteError;
    }

    const { error: insertError } = await supabase
      .from('template_exercises')
      .insert(inserts);

    if (insertError) {
      console.error('Error saving template exercises:', insertError);
      throw insertError;
    }

    navigate('/templates');
  };

  const handleSaveWorkout = async () => {
    if (authLoading || !userId) {
      setErrorMessage('Please wait for session to load.');
      return;
    }

    const validExercises = selectedExercisesData.filter(e => !!e.exercise_id);
    if (validExercises.length === 0) {
      setErrorMessage('Add at least one exercise to your workout.');
      return;
    }

    const normalizedExercises = validExercises.map((ex, idx) => ({
      ...ex,
      order: idx,
    }));

    setErrorMessage(null);
    setStatusMessage(
      isEditingWorkout ? 'Updating workout...' : 'Saving workout...'
    );
    setSaving(true);

    try {
      if (isEditingWorkout && editingWorkoutId) {
        setStatusMessage('Refreshing workout...');
				const { error } = await updateWorkoutFromBuilder({
          workoutId: editingWorkoutId,
          date: selectedDate,
          exercises: normalizedExercises,
        });

        if (error) {
          throw new Error(error);
        }

        setStatusMessage('Workout updated! Redirecting...');
        navigate(`/workout/${editingWorkoutId}`);
        setSaving(false);
        return;
      }

      setStatusMessage('Creating workout...');
			const { data, error } = await createWorkoutFromBuilder({
        userId,
        date: selectedDate,
        exercises: normalizedExercises,
      });

      if (error || !data) {
        setErrorMessage(error ?? 'Failed to create workout.');
        setSaving(false);
        return;
      }
      setStatusMessage('Workout saved! Redirecting...');
      navigate(`/workout/${data.id}`);
    } catch (err) {
      console.error('Unexpected error saving workout:', err);
      setErrorMessage('Failed to save workout. Please try again.');
      setStatusMessage(null);
    } finally {
      setSaving(false);
    }
  };

  const handlePrimarySave = async () => {
    if (isEditingTemplate) {
      setSaving(true);
      setStatusMessage('Saving template...');
      setErrorMessage(null);
      try {
        await handleSaveTemplate(selectedExercisesData);
        setStatusMessage('Template saved! Redirecting...');
      } catch (err: any) {
        const message =
          err?.message ?? 'Failed to save template. Please try again.';
        setErrorMessage(message);
        setStatusMessage(null);
      } finally {
        setSaving(false);
      }
    } else {
      await handleSaveWorkout();
    }
  };

  const sortedBuilderExercises = useMemo(
    () => [...selectedExercisesData].sort((a, b) => a.order - b.order),
    [selectedExercisesData]
  );

  const primaryButtonLabel = isEditingTemplate
    ? 'Save Template'
    : isEditingWorkout
    ? 'Update Workout'
    : 'Save';

  return (
    <div className="plan-page">
      <Layout padded={false} maxWidth="xl">
        <div className="plan-hero">
          <div className="plan-title">
            <h1>Plan your lift</h1>
            <p><em>Better planning. Better workouts. Better results.</em></p>
          </div>

          <div className="plan-grid">
            <div className="plan-workout-card sticky-card" data-tone="workout">
              <div className="plan-workout-card__header">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="card-date"
                />
              </div>

              <div className="plan-workout-card__list">
                {sortedBuilderExercises.length === 0 && (
                  <div className="empty-card">
                    Select lifts on the right to add them to your workout.
                  </div>
                )}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedBuilderExercises.map(ex => ex.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedBuilderExercises.map(ex => (
                      <BuilderRow
                        key={ex.id}
                        exercise={ex}
                        weightUnitLabel={weightUnitLabel}
                        onChange={handleChangeExercise}
                        onRemove={handleRemoveExercise}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              <button
                className="save-button"
                onClick={handlePrimarySave}
                disabled={saving}
              >
                {saving ? 'Saving...' : primaryButtonLabel}
              </button>

            </div>

            <div className="exercise-panel" data-tone="library">
              <div className="search-row">
                <span className="filter-icon" aria-hidden="true"><Search size={18} /></span>
                <input
                  type="text"
                  className="exercise-search"
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="exercise-list">
                {loadingExercises ? (
                  <p>Loading exercises...</p>
                ) : availableExercises.length === 0 ? (
                  <p className="muted">
                    All matching lifts are already in your workout.
                  </p>
                ) : (
					availableExercises.map((exercise) => (
										<ExerciseChip
                      key={exercise.id}
                      tone="library"
                      name={exercise.name}
                      meta={
                        <>{exercise.target_muscle}{' · '}{exercise.exercise_type === 'cardio' ? 'Cardio' : 'Strength'}</>
                      }
                      icon={<Plus aria-hidden="true" size={18} />}
                      ariaLabel={`Add ${exercise.name}`}
                      onClick={() => toggleExercise(exercise.id)}
                    />
                  ))
                )}
								<WorkoutButton
									label='Add a Custom Exercise'
									icon={<Plus size={20} />}
									variant="primary"
									tone="library"
									size="lg"
									onClick={() => setAddingCustom(true)}
									rounded="default"
								/>
              </div>
            </div>
          </div>


          <div className="template-import">
            <h3>Import a Template</h3>
            {loadingTemplates ? (
              <p>Loading templates...</p>
            ) : templates.length === 0 ? (
              <p className="muted">No templates available yet.</p>
            ) : (
              <div className="template-buttons">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    className="template-pill"
                    data-tone="library"
                    onClick={() => navigate(`/plan?importTemplate=${template.id}`)}
                  >
                    Import &quot;{template.name}&quot; +
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
			<Drawer isOpen={addingCustom} onClose={closeCustomDrawer} width={440} tone="library">
        <div data-tone="library">
        <div className="custom-drawer__header">
          <h2>Create a custom exercise</h2>
        </div>
        <p className="custom-drawer__subtitle">
          Add a strength or cardio exercise to your library and workout.
        </p>
        <div className="custom-lift__form">
          <input
            type="text"
            placeholder="Exercise name"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
          />
          <select value={customExerciseType} onChange={event => setCustomExerciseType(event.target.value as ExerciseType)}>
            <option value="strength">Strength</option>
            <option value="cardio">Cardio</option>
          </select>
          {customExerciseType === 'cardio' && (
            <>
              <label>
                <span>Default distance unit</span>
                <select
                  value={customDistanceUnit}
                  onChange={event => setCustomDistanceUnit(event.target.value as DistanceUnit)}
                >
                  {getDistanceUnitOptions(distanceSystem).map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <SwitchField
                checked={customTrackLaps}
                label="Track laps"
                onChange={setCustomTrackLaps}
              />
            </>
          )}
          <input
            type="text"
            placeholder="Target muscle"
            value={customMuscle}
            onChange={e => setCustomMuscle(e.target.value)}
          />
          <div className="custom-actions">
            <button onClick={addCustomExercise}>Add</button>
            <button onClick={closeCustomDrawer}>Cancel</button>
          </div>
        </div>
        </div>
      </Drawer>
    </div>
	);
}
