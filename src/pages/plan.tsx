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

  // Fetch template or workout if query param exists
	const [hasImported, setHasImported] = useState(false);

useEffect(() => {
  if (hasImported) return; // do not re-import after first time

  async function fetchImportedData() {
    try {
      let cleaned: ConfiguredExercise[] = [];

      // Import template for a new workout
      if (importingTemplate && queryTemplateId) {
        const { data, error } = await supabase
          .from('template_exercises')
          .select(`
            exercise_id,
            sets,
            reps,
            order,
            exercise:exercise_id(name, target_muscle)
          `)
          .eq('template_id', queryTemplateId)
          .order('order', { ascending: true });

        if (error) return console.error('Template import error:', error);

        cleaned = data.map((item: any, i: number) => ({
          exercise_id: item.exercise_id,
          name: item.exercise?.name ?? '',
          target_muscle: item.exercise?.target_muscle ?? '',
          sets: item.sets ?? 3,
          reps: item.reps ?? 8,
          weight: item.weight ?? 0,
          order: item.order ?? i,
        }));

        setStep(1); // allow editing before scheduling

      // Edit template workflow
      } else if (isEditingTemplate && queryTemplateId) {
        const { data, error } = await supabase
          .from('template_exercises')
          .select(`
            exercise_id,
            sets,
            reps,
            order,
            exercise:exercise_id(name, target_muscle)
          `)
          .eq('template_id', queryTemplateId)
          .order('order', { ascending: true });

        if (error) return console.error('Template fetch error:', error);

        cleaned = data.map((item: any, i: number) => ({
          exercise_id: item.exercise_id,
          name: item.exercise?.name ?? '',
          target_muscle: item.exercise?.target_muscle ?? '',
          sets: item.sets ?? 3,
          reps: item.reps ?? 8,
          weight: item.weight ?? 0,
          order: item.order ?? i,
        }));

      // Import existing workout
      } else if (importWorkoutId) {
        const { data, error } = await supabase
          .from('workout_exercises')
          .select(`
            exercise_id,
            sets,
            reps,
            weight,
            order,
            exercise:exercise_id(name, target_muscle)
          `)
          .eq('workout_id', importWorkoutId)
          .order('order', { ascending: true });

        if (error) return console.error('Workout import error:', error);

        cleaned = data.map((item: any, i: number) => ({
          exercise_id: item.exercise_id,
          name: item.exercise?.name ?? '',
          target_muscle: item.exercise?.target_muscle ?? '',
          sets: item.sets ?? 3,
          reps: item.reps ?? 8,
          weight: item.weight ?? 0,
          order: item.order ?? i,
        }));

        setStep(1); // allow editing
      }

      if (cleaned.length > 0) {
        setSelectedExerciseIds(cleaned.map(e => e.exercise_id));
        setSelectedExercisesData(cleaned);
        setHasImported(true); // mark as imported to prevent overwriting
      }

    } catch (err) {
      console.error('Error fetching imported data:', err);
    }
  }

  fetchImportedData();
}, [importingTemplate, isEditingTemplate, importWorkoutId, queryTemplateId, hasImported]);



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
    if (!queryTemplateId) return;

    const { error: deleteError } = await supabase
      .from('template_exercises')
      .delete()
      .eq('template_id', queryTemplateId);

    if (deleteError) {
      console.error('Error deleting old template exercises:', deleteError);
      alert('Failed to update template.');
      return;
    }

    const inserts = configured.map((ex, i) => ({
      template_id: queryTemplateId,
      exercise_id: ex.exercise_id,
      sets: ex.sets,
      reps: ex.reps,
      order: i
    }));

    const { error: insertError } = await supabase
      .from('template_exercises')
      .insert(inserts);

    if (insertError) {
      console.error('Error inserting updated exercises:', insertError);
      alert('Failed to save template.');
      return;
    }

    // alert('✅ Template updated!');
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

						    const selected = (isEditingTemplate || importWorkoutId)
						      ? selectedExercisesData // keep DB-loaded sets/reps/weight
						      : exercises
						          .filter(e => selectedExerciseIds.includes(e.id))
						          .map((e, i) => ({
						            exercise_id: e.id,
						            name: e.name,
						            target_muscle: e.target_muscle,
						            sets: e.sets ?? 3,
						            reps: e.reps ?? 8,
						            weight: e.weight ?? 0,
						            order: i,
						          }));

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
			    templateId={isEditingTemplate ? queryTemplateId ?? undefined : undefined}
			    onSaveTemplate={isEditingTemplate ? handleSaveTemplate : undefined}
			    isEditingWorkout={importingTemplate || importWorkoutId ? true : false}
			    editingWorkoutId={importWorkoutId}
			  />
			)}
    </Layout>
  );
}
