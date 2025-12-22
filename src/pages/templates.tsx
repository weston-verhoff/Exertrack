import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { Layout } from '../components/Layout';
import { TemplateCard } from '../components/TemplateCard';
import { useAuth } from '../context/AuthContext';

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
  const { userId, loading: authLoading } = useAuth()

  useEffect(() => {
    async function fetchTemplates() {
      if (!userId) return

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
            exercise:exercise_id(id, name, target_muscle)
          )
        `)
        .eq('user_id', userId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching templates:', error)
      } else {
        // Map the exercises to match TemplateCard props
        const cleaned = data.map((t: any) => ({
          ...t,
          template_exercises: t.template_exercises.map((te: any) => ({
            id: te.id,
            sets: te.sets,
            reps: te.reps,
            order: te.order,
            exercise: Array.isArray(te.exercise) ? te.exercise[0] : te.exercise
          }))
        }))
        setTemplates(cleaned)
      }
      setLoading(false)
      console.log('Fetched templates:', data);
    }

    if (authLoading) return

    if (!userId) {
      setTemplates([])
      setLoading(false)
      return
    }

    fetchTemplates()
  }, [authLoading, userId])

  const deleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this template?')) return

    if (!userId) return

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting template:', error)
      alert('Could not delete template.')
    } else {
      setTemplates(prev => prev.filter(t => t.id !== id))
    }
  }

  const renameTemplate = (id: string) => {
		const currentTemplate = templates.find(t => t.id === id)
  	if (!currentTemplate) return
    const newName = window.prompt('Enter new template name:', currentTemplate.name)
    if (!newName) return

    if (!userId) return

    supabase
      .from('templates')
      .update({ name: newName })
      .eq('id', id)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) {
          alert('Failed to rename template.')
        } else {
          setTemplates(prev =>
            prev.map(t => (t.id === id ? { ...t, name: newName } : t))
          )
        }
      })
  }

	const useTemplate = (id: string) => {
  navigate(`/plan?importTemplate=${id}`);
};


  return (
    <Layout>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>Saved Templates</h1>

      {loading ? (
        <p>Loading templates...</p>
      ) : templates.length === 0 ? (
        <p>No templates found.</p>
      ) : (
        <div className="past-workouts">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={{
                id: t.id,
                name: t.name,
                exercises: t.template_exercises
              }}
              onRename={renameTemplate}
              onDelete={deleteTemplate}
							onUse={useTemplate}
            />
          ))}
				</div>
      )}

      <button onClick={() => navigate('/')}>🏠 Return to Dashboard</button>
    </Layout>
  );
}
