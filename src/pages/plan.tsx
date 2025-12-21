import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useExercises } from '../hooks/useExercises';
import { useTemplates } from '../hooks/useTemplates';
import { supabase } from '../supabase/client';
import Step2ConfigureCircuit, { ConfiguredExercise } from '../components/PlanSession/Step2ConfigureCircuit';
import { Layout } from '../components/Layout';

export default function PlanSession() {
  const [searchParams] = useSearchParams();
  const queryTemplateId = searchParams.get('importTemplate');
  const queryWorkoutId = searchParams.get('importWorkout');
	const isEditingTemplate = searchParams.get('editTemplate') !== null;
	const importingTemplate = searchParams.get('importTemplate') !== null;
  const importWorkoutId = queryWorkoutId ?? undefined;
	const editTemplateId = searchParams.get('editTemplate');
	const activeTemplateId =
	  editTemplateId ?? queryTemplateId ?? undefined;


  const { exercises, loading: loadingExercises, refetch } = useExercises();
  const { templates, loading: loadingTemplates } = useTemplates();
  const navigate = useNavigate();

  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [selectedExercisesData, setSelectedExercisesData] = useState<ConfiguredExercise[]>([]);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
	const templateParam =
	  searchParams.get('importTemplate') ??
	  searchParams.get('editTemplate');
	const workoutParam = searchParams.get('importWorkout');

  // Fetch template or workout if query param exists
	const [lastImportedKey, setLastImportedKey] = useState<string | null>(null);
	const importKey =
  templateParam
    ? `template:${templateParam}`
    : workoutParam
    ? `workout:${workoutParam}`
    : null;

		useEffect(() => {
  if (!importKey) return;
  if (lastImportedKey === importKey) return;

  async function fetchImportedData() {
    try {
      let cleaned: ConfiguredExercise[] = [];

      if (templateParam) {
				const { data, error } = await supabase
				  .from('template_exercises')
				  .select(`
				    exercise_id,
				    sets,
				    reps,
				    order,
				    exercise:exercises!template_exercises_exercise_id_fkey (
				      id,
				      name,
				      target_muscle
				    )
				  `)
				  .eq('template_id', templateParam)
				  .order('order', { ascending: true });

        if (error) throw error;

				cleaned = (data ?? []).map((item: any, i: number) => ({
				  id: `template-${templateParam}-${item.exercise_id}`, // 🔑
				  exercise_id: item.exercise_id,
					name: item.exercise?.name ?? '',
				  order: item.order ?? i,
				  sets: Array.from({ length: item.sets ?? 3 }, (_, idx) => ({
				    set_number: idx + 1,
				    reps: item.reps ?? 8,
				    weight: 0,
				    intensity_type: 'normal',
				  })),
				}));

      }
			const invalid = cleaned.filter(e => !e.exercise_id);

			if (invalid.length > 0) {
			  console.error('[IMPORT] Invalid exercises detected:', invalid);
			  throw new Error('Template contains exercises without valid exercise_id');
			}
      else if (workoutParam) {
        const { data, error } = await supabase
          .from('workout_exercises')
          .select(`
            exercise_id,
            order,
            exercise:exercise_id (
              id,
              name,
              target_muscle
            ),
            workout_sets (
              set_number,
              reps,
              weight,
              intensity_type
            )
          `)
          .eq('workout_id', workoutParam)
          .order('order', { ascending: true });

        if (error) throw error;

				cleaned = (data ?? []).map((item: any, i: number) => ({
				  id: `workout-${workoutParam}-${item.exercise_id}`, // 🔑
				  exercise_id: item.exercise_id,
				  name: item.exercise?.name ?? '',
				  order: item.order ?? i,
				  sets: item.workout_sets?.length
				    ? item.workout_sets
				    : [{
				        set_number: 1,
				        reps: 8,
				        weight: 0,
				        intensity_type: 'normal',
				      }],
				}));

      }

      if (cleaned.length > 0) {
        setSelectedExerciseIds(cleaned.map(e => e.exercise_id));
        setSelectedExercisesData(cleaned);
        setLastImportedKey(importKey);
        setStep(1);
      }
    } catch (err) {
      console.error('[IMPORT] Failed:', err);
    }
  }

  fetchImportedData();
}, [
  templateParam,
  workoutParam,
  importKey,
  lastImportedKey,
]);






  const toggleExercise = (id: string) => {
		setSelectedExerciseIds(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const addCustomExercise = async () => {
    if (!customName || !customMuscle) return;

    const { data, error } = await supabase
      .from('exercises')
      .insert([{ name: customName, target_muscle: customMuscle, is_custom: true }])
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

  const handleSaveTemplate = async (configured: ConfiguredExercise[]) => {
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

		const { error: transactionError } = await supabase.rpc(
		  'replace_template_exercises',
		  {
		    template_id: activeTemplateId,
		    exercises_payload: inserts,
		  }
		);

		if (transactionError) {
		  console.error('Error saving template transaction:', transactionError);
		  throw transactionError;
		}

    navigate('/templates');
  };

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.target_muscle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout padded maxWidth="xl" scrollable>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>
        {isEditingTemplate ? 'Edit Template' : 'Plan Session'}
      </h1>

      {step === 1 && (
        <>
          {/* Import Templates only if NOT editing */}
          {!isEditingTemplate && (
            <section>
              <h2>Import from Template</h2>
              {loadingTemplates ? (
                <p>Loading templates...</p>
              ) : (
                <ul className="session-planner-exercises">
                  {templates.map(t => (
                    <li key={t.id}>
                      <button
                        onClick={() => navigate(`/plan?importTemplate=${t.id}`)}
                      >
                        Import "{t.name}"
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Select Exercises */}
          <section>
            <h2>Select Exercises</h2>
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {loadingExercises ? (
              <p>Loading exercises...</p>
            ) : (
              <ul className="session-planner-exercises">
							{filteredExercises.map(e => (
								<li key={e.id}>
									<label>
										<input
											type="checkbox"
											checked={selectedExerciseIds.includes(e.id)}
											onChange={() => toggleExercise(e.id)}
										/>
										{e.name} ({e.target_muscle})
									</label>
								</li>
								))}
              </ul>
            )}
          </section>

          {/* Add Custom */}
          <section className = "planning-buttons">
            {addingCustom ? (
              <div>
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
                <button onClick={addCustomExercise}>Add</button>
                <button onClick={() => setAddingCustom(false)}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingCustom(true)}>Add Custom Movement</button>
            )}
						<button
						  onClick={() => {
						    let selected: ConfiguredExercise[] = [];

								if (isEditingTemplate) {
								  // ✏️ Editing template: sync to checkboxes (add + remove)
								  const existing = selectedExercisesData;

								  // 1️⃣ Keep only exercises that are still checked
								  const kept = existing.filter(ex =>
								    selectedExerciseIds.includes(ex.exercise_id)
								  );

								  const keptIds = new Set(kept.map(e => e.exercise_id));

								  // 2️⃣ Add newly checked exercises
								  const additions = exercises
								    .filter(
								      e =>
								        selectedExerciseIds.includes(e.id) &&
								        !keptIds.has(e.id)
								    )
								    .map((e, i) => ({
								      id: `manual-${e.id}-${Date.now()}`,
								      exercise_id: e.id,
								      name: e.name,
								      order: kept.length + i,
								      sets: Array.from({ length: 3 }, (_, idx) => ({
								        set_number: idx + 1,
								        reps: 8,
								        weight: 0,
								        intensity_type: 'normal',
								      })),
								    }));

								  // 3️⃣ Combine + normalize order
								  selected = [...kept, ...additions].map((ex, i) => ({
								    ...ex,
								    order: i,
								  }));
								}
								 else if (importingTemplate) {
						      // 📦 Importing template: preserve exactly
						      selected = selectedExercisesData;

						    } else if (importWorkoutId) {
						      // ✏️ Editing workout: sync to checkboxes (add + remove)
						      const existing = selectedExercisesData;

						      const kept = existing.filter(ex =>
						        selectedExerciseIds.includes(ex.exercise_id)
						      );

						      const keptIds = new Set(kept.map(e => e.exercise_id));

						      const additions = exercises
						        .filter(
						          e =>
						            selectedExerciseIds.includes(e.id) &&
						            !keptIds.has(e.id)
						        )
						        .map((e, i) => ({
						          id: `manual-${e.id}-${Date.now()}`,
						          exercise_id: e.id,
						          name: e.name,
						          order: kept.length + i,
						          sets: Array.from({ length: 3 }, (_, idx) => ({
						            set_number: idx + 1,
						            reps: 8,
						            weight: 0,
						            intensity_type: 'normal',
						          })),
						        }));

						      selected = [...kept, ...additions].map((ex, i) => ({
						        ...ex,
						        order: i,
						      }));

						    } else {
						      // 🆕 NEW WORKOUT FROM SCRATCH (THIS WAS MISSING)
						      selected = exercises
						        .filter(e => selectedExerciseIds.includes(e.id))
						        .map((e, i) => ({
						          id: `manual-${e.id}-${Date.now()}`,
						          exercise_id: e.id,
						          name: e.name,
						          order: i,
						          sets: Array.from({ length: 3 }, (_, idx) => ({
						            set_number: idx + 1,
						            reps: 8,
						            weight: 0,
						            intensity_type: 'normal',
						          })),
						        }));
						    }

						    setSelectedExercisesData(selected);
						    setStep(2);
						  }}
						>
						  Next →
						</button>

          </section>
        </>
      )}

			{step === 2 && (
			  <Step2ConfigureCircuit
			    selectedExercises={selectedExercisesData}
			    onNext={() => navigate('/')}
			    isEditingTemplate={isEditingTemplate} // true only if editing
			    templateId={isEditingTemplate ? activeTemplateId ?? undefined : undefined}
			    onSaveTemplate={isEditingTemplate ? handleSaveTemplate : undefined}
			    isEditingWorkout={importingTemplate || importWorkoutId ? true : false}
			    editingWorkoutId={importWorkoutId}
			  />
			)}
    </Layout>
  );
}
