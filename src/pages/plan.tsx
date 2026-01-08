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
import '../styles/plan.css';
import { BuilderExerciseConfig } from '../types/workoutBuilder';
import {
  createWorkoutFromBuilder,
  fetchTemplateBuilderExercises,
  fetchWorkoutBuilderExercises,
  updateWorkoutFromBuilder,
} from '../services/workoutService';

type BuilderRowProps = {
  exercise: BuilderExerciseConfig;
  onChange: (
    id: string,
    field: 'sets' | 'reps' | 'weight',
    value: number
  ) => void;
  onRemove: (exerciseId: string, configId: string) => void;
};

function BuilderRow({ exercise, onChange, onRemove }: BuilderRowProps) {
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
      <button
        className="remove-chip"
        onClick={() => onRemove(exercise.exercise_id, exercise.id)}
        aria-label={`Remove ${exercise.name}`}
      >
        ✕
      </button>

      <div className="builder-row__info">
        <div className="builder-row__name">{exercise.name}</div>
        <div className="builder-row__muscle">
          {exercise.target_muscle ?? 'Full Body'}
        </div>
      </div>

      <div className="builder-row__stats">
        <label className="stat-field">
          <input
            type="number"
            value={exercise.sets.length}
            min={0}
            onChange={e =>
              onChange(exercise.id, 'sets', Number(e.target.value) || 0)
            }
          />
          <span className="stat-label">SETS</span>
        </label>
        <label className="stat-field">
          <input
            type="number"
            value={exercise.sets[0]?.reps ?? 0}
            min={0}
            onChange={e =>
              onChange(exercise.id, 'reps', Number(e.target.value) || 0)
            }
          />
          <span className="stat-label">REPS</span>
        </label>
        <label className="stat-field">
          <input
            type="number"
            value={exercise.sets[0]?.weight ?? 0}
            min={0}
            onChange={e =>
              onChange(exercise.id, 'weight', Number(e.target.value) || 0)
            }
          />
          <span className="stat-label">LBS</span>
        </label>
      </div>

      <span className="drag-handle" {...attributes} {...listeners}>
        ☰
      </span>
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
  } = useExercises();
  const { templates, loading: loadingTemplates } = useTemplates();
  const { userId, loading: authLoading } = useAuth();

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
  const [addingCustom, setAddingCustom] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastImportedKey, setLastImportedKey] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const importKey = useMemo(() => {
    if (queryTemplateId) return `template:${queryTemplateId}`;
    if (queryWorkoutId) return `workout:${queryWorkoutId}`;
    return null;
  }, [queryTemplateId, queryWorkoutId]);

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

        if (queryTemplateId) {const { data, error } = await fetchTemplateBuilderExercises(
            queryTemplateId
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
          const sorted = cleaned.sort((a, b) => a.order - b.order);
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
        order: prev.length,
        sets: Array.from({ length: 3 }, (_, idx) => ({
          set_number: idx + 1,
          reps: 8,
          weight: 0,
          intensity_type: 'normal',
        })),
      };

      return [...prev, newExercise];
    });
  };

  const handleChangeExercise = (
    id: string,
    field: 'sets' | 'reps' | 'weight',
    value: number
  ) => {
    setSelectedExercisesData(prev =>
      prev.map(ex => {
        if (ex.id !== id) return ex;

        const nextSets = [...ex.sets];

        if (field === 'sets') {
          const count = Math.max(0, value);
          if (count > nextSets.length) {
            nextSets.push(
              ...Array.from({ length: count - nextSets.length }, (_, idx) => ({
                set_number: nextSets.length + idx + 1,
                reps: nextSets[0]?.reps ?? 8,
                weight: nextSets[0]?.weight ?? 0,
                intensity_type: 'normal',
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
          const reps = Math.max(0, value);
          nextSets.forEach(set => {
            set.reps = reps;
          });
        }

        if (field === 'weight') {
          const weight = Math.max(0, value);
          nextSets.forEach(set => {
            set.weight = weight;
          });
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
        },
      ])
      .select();

    if (error) {
      console.error('Error adding custom exercise:', error);
    } else if (data && data[0]) {
      setSelectedExerciseIds(prev => [...prev, data[0].id]);
      setCustomName('');
      setCustomMuscle('');
      setAddingCustom(false);
      await refetch();
    }
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
            <div className="plan-workout-card sticky-card">
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

              {statusMessage && (
                <p className="status-message status-message--info">
                  {statusMessage}
                </p>
              )}
              {errorMessage && (
                <p className="status-message status-message--error">
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="exercise-panel">
              <div className="search-row">
                <span className="filter-icon">🔍</span>
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
                  availableExercises.map(exercise => (
										<button
                      key={exercise.id}
                      type="button"
                      className="exercise-pill"
                      onClick={() => toggleExercise(exercise.id)}
                      aria-label={`Add ${exercise.name}`}
                    >
                      <span className="add-chip" aria-hidden="true">
                        +
                      </span>
                      <span className="exercise-pill__meta">
                        <span className="exercise-pill__name">
                          {exercise.name}
                        </span>
                        <span className="exercise-pill__muscle">
                          {exercise.target_muscle}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
							<div className="custom-lift">
                {addingCustom ? (
                  <div className="custom-lift__form">
                    <input
                      type="text"
                      placeholder="Exercise name"
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Target muscle"
                      value={customMuscle}
                      onChange={e => setCustomMuscle(e.target.value)}
                    />
                    <div className="custom-actions">
                      <button onClick={addCustomExercise}>Add</button>
                      <button onClick={() => setAddingCustom(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="custom-lift__trigger"
                    onClick={() => setAddingCustom(true)}
                  >
                    Add a Custom Lift +
                  </button>
                )}
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
                {templates.map(template => (
                  <button
                    key={template.id}
                    className="template-pill"
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
    </div>
	);
}
