import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useExercises } from '../hooks/useExercises';
import { useTemplates } from '../hooks/useTemplates';
import { supabase } from '../supabase/client';

import Step2ConfigureCircuit, { ConfiguredExercise } from '../components/PlanSession/Step2ConfigureCircuit';
import { Layout } from '../components/Layout';

export default function PlanSession() {
  const { id: routeTemplateId } = useParams();
  const isEditingTemplate = !!routeTemplateId;
  const [searchParams] = useSearchParams();
  const queryTemplateId = searchParams.get('importTemplate');
  const templateId = routeTemplateId ?? queryTemplateId;

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

  useEffect(() => {
    async function fetchTemplate() {
      if (!templateId) return;

      const { data, error } = await supabase
        .from('template_exercises')
        .select(`
          sets,
          reps,
          order,
          exercise:exercise_id(id, name, target_muscle)
        `)
        .eq('template_id', templateId)
        .order('order', { ascending: true });

      if (error || !data) {
        console.error('Error importing template:', error);
        return;
      }

      const cleaned = data.map((te: any) => ({
        exercise_id: te.exercise.id,
        name: te.exercise.name,
        target_muscle: te.exercise.target_muscle,
        sets: te.sets,
        reps: te.reps,
        order: te.order ?? 0
      }));

      setSelectedExerciseIds(cleaned.map(e => e.exercise_id));
      setSelectedExercisesData(cleaned);
      setStep(2);
    }

    fetchTemplate();
  }, [templateId]);

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
    if (!routeTemplateId) return;

    const { error: deleteError } = await supabase
      .from('template_exercises')
      .delete()
      .eq('template_id', routeTemplateId);

    if (deleteError) {
      console.error('Error deleting old template exercises:', deleteError);
      alert('Failed to update template.');
      return;
    }

    const inserts = configured.map((ex, i) => ({
      template_id: routeTemplateId,
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

    alert('✅ Template updated!');
    navigate('/templates');
  };

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.target_muscle.toLowerCase().includes(searchQuery.toLowerCase())
  );

	return (
  <Layout padded maxWidth="xl" scrollable>
		<div>
    <h1 style={{ fontFamily: 'var(--font-headline)' }}>
      {isEditingTemplate ? 'Edit Template' : 'Plan Session'}
    </h1>

    {step === 1 && (
      <>
        {/* 🧠 Import from Template */}
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
                      style={{ marginBottom: '0.5rem' }}
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

        {/* 🏋️ Select Exercises */}
        <section>
          <h2>Select Exercises</h2>
          <input
            type="text"
            className="exerciseSearch"
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
                    {e.is_custom && <span style={{ color: '#888' }}> [Custom]</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ✏️ Add Custom Movement */}
        <section>
          <h2>Add Custom Movement</h2>
          {addingCustom ? (
            <div>
              <input
                type="text"
                placeholder="Exercise name"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              <input
                type="text"
                placeholder="Target muscle"
                value={customMuscle}
                onChange={e => setCustomMuscle(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              <button onClick={addCustomExercise}>Add</button>
              <button onClick={() => setAddingCustom(false)} style={{ marginLeft: '0.5rem' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingCustom(true)}>Add Custom Movement</button>
          )}
        </section>

        {/* ➡️ Proceed to Step 2 */}
        <section style={{ marginTop: '2rem' }}>
          <button
            style={{
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              border: 'none',
              borderRadius: '4px'
            }}
            onClick={() => {
              const selected = exercises
                .filter(e => selectedExerciseIds.includes(e.id))
                .map((e, i) => ({
                  exercise_id: e.id,
                  name: e.name,
                  target_muscle: e.target_muscle,
                  sets: 3,
                  reps: 8,
                  order: i
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
        isEditingTemplate={isEditingTemplate}
        templateId={routeTemplateId}
        onSaveTemplate={handleSaveTemplate}
      />
    )}
		</div>
  </Layout>
);
}
