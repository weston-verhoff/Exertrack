import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'

interface TemplateExercise {
  id: string
  sets: number
  reps: number
  order: number
  exercise: {
    name: string
    target_muscle: string
  }
}

interface Template {
  id: string
  name: string
  template_exercises: TemplateExercise[]
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchTemplates() {
      const { data, error } = await supabase
        .from('templates')
        .select(`
          id,
          name,
          template_exercises (
            id,
            sets,
            reps,
            order,
            exercise:exercise_id(name, target_muscle)
          )
        `)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching templates:', error)
      } else {
        const cleaned = data.map((t: any) => ({
          ...t,
          template_exercises: t.template_exercises.map((te: any) => ({
            ...te,
            exercise: Array.isArray(te.exercise) ? te.exercise[0] : te.exercise
          }))
        }))
        setTemplates(cleaned)
      }

      setLoading(false)
    }

    fetchTemplates()
  }, [])

  const deleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this template?')) return

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      alert('Could not delete template.')
    } else {
      setTemplates(prev => prev.filter(t => t.id !== id))
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>Saved Templates</h1>

      {loading ? (
        <p>Loading templates...</p>
      ) : templates.length === 0 ? (
        <p>No templates found.</p>
      ) : (
        <ul>
          {templates.map(t => (
            <li key={t.id} style={{ marginBottom: '2rem' }}>
              <strong>{t.name}</strong>
              <ul>
                {t.template_exercises
                  .sort((a: TemplateExercise, b: TemplateExercise) => a.order - b.order)
                  .map((te: TemplateExercise) => (
                    <li key={te.id}>
                      {te.exercise.name} ({te.exercise.target_muscle}) – {te.sets}×{te.reps}
                    </li>
                  ))}
              </ul>
              <button onClick={() => deleteTemplate(t.id)}>🗑 Delete</button>{' '}
              <button onClick={() => navigate(`/plan?importTemplate=${t.id}`)}>➕ Use This</button>
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => navigate('/')}>🏠 Return to Dashboard</button>
    </div>
  )
}
