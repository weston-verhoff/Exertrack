import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useExercises } from '../hooks/useExercises'
import { useTemplates } from '../hooks/useTemplates'
import { supabase } from '../supabase/client'
import { useNavigate } from 'react-router-dom'

import Step2_ConfigureCircuit, { ConfiguredExercise } from '../components/PlanSession/Step2_ConfigureCircuit'

export default function PlanSession() {
  const { exercises, loading: loadingExercises, refetch } = useExercises()
  const { templates, loading: loadingTemplates } = useTemplates()
  const [searchParams] = useSearchParams()
  const importTemplateId = searchParams.get('importTemplate')
  const navigate = useNavigate()

  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
  const [selectedExercisesData, setSelectedExercisesData] = useState<ConfiguredExercise[]>([])
  const [customName, setCustomName] = useState('')
  const [customMuscle, setCustomMuscle] = useState('')
  const [addingCustom, setAddingCustom] = useState(false)
  const [step, setStep] = useState(1)

  // ✅ Automatically import exercises from a selected template
  useEffect(() => {
    async function fetchTemplate() {
      if (!importTemplateId) return

      const { data, error } = await supabase
        .from('template_exercises')
        .select(`
          sets,
          reps,
          order,
          exercise:exercise_id(id, name, target_muscle)
        `)
        .eq('template_id', importTemplateId)
        .order('order', { ascending: true })

      if (error || !data) {
        console.error('Error importing template:', error)
        return
      }

      const cleaned = data.map((te: any) => ({
        exercise_id: te.exercise.id,
        name: te.exercise.name,
        target_muscle: te.exercise.target_muscle,
        sets: te.sets,
        reps: te.reps,
        order: te.order ?? 0
      }))

      setSelectedExerciseIds(cleaned.map(e => e.exercise_id))
      setSelectedExercisesData(cleaned)
      setStep(2)
    }

    fetchTemplate()
  }, [importTemplateId])

  const toggleExercise = (id: string) => {
    setSelectedExerciseIds(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const addCustomExercise = async () => {
    if (!customName || !customMuscle) return

    const { data, error } = await supabase
      .from('exercises')
      .insert([{ name: customName, target_muscle: customMuscle, is_custom: true }])
      .select()

    if (error) {
      console.error('Error adding custom exercise:', error)
    } else if (data && data[0]) {
      setSelectedExerciseIds(prev => [...prev, data[0].id])
      setCustomName('')
      setCustomMuscle('')
      setAddingCustom(false)
      await refetch()
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>Plan Session</h1>

      {step === 1 && (
        <>
          <section>
            <h2>Import from Template</h2>
            {loadingTemplates ? (
              <p>Loading templates...</p>
            ) : (
              <ul>
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

          <section>
            <h2>Select Exercises</h2>
            {loadingExercises ? (
              <p>Loading exercises...</p>
            ) : (
              <ul>
                {exercises.map(e => (
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
                  }))
                setSelectedExercisesData(selected)
                setStep(2)
              }}
            >
              Next →
            </button>
          </section>
        </>
      )}

      {step === 2 && (
        <Step2_ConfigureCircuit
          selectedExercises={selectedExercisesData}
					onNext={() => {
					  navigate('/')
					}}
        />
      )}
    </div>
  )
}
