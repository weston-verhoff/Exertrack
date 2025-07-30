// src/pages/past.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { deleteWorkoutById } from '../utils/deleteWorkout'
import { Layout } from '../components/Layout'


export default function PastWorkouts() {
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchWorkouts() {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          template:template_id(name),
          workout_exercises (
            id,
            sets,
            reps,
            weight,
            exercise:exercise_id(target_muscle)
          )
        `)
        .order('date', { ascending: false })

      if (error) console.error('Error fetching workouts:', error)
      else setWorkouts(data || [])

      setLoading(false)
    }

    fetchWorkouts()
  }, [])

  const getFocusMuscles = (we: any[]) => {
    const groups = new Set<string>()
    we.forEach(e => groups.add(e.exercise.target_muscle))
    return Array.from(groups).join(', ')
  }

	const deleteWorkout = async (id: string) => {
	  if (!window.confirm('Delete this workout?')) return

	  const success = await deleteWorkoutById(id)

	  if (!success) {
	    alert('Could not delete workout.')
	  } else {
	    setWorkouts(prev => prev.filter(w => w.id !== id))
	  }
	}


  return (
    <Layout>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>Past Workouts</h1>

      {loading ? (
        <p>Loading...</p>
      ) : workouts.length === 0 ? (
        <p>No workouts found.</p>
      ) : (
        <ul>
          {workouts.map(w => (
            <li key={w.id} style={{ marginBottom: '1rem' }}>
              <strong>{w.date}</strong>{' '}
              {w.template?.name ? `– ${w.template.name}` : ''}
              <br />
              Muscles: {getFocusMuscles(w.workout_exercises)}
              <br />
							<div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
						  <button
						    onClick={() => navigate(`/workout/${w.id}`)}
						    style={{
						      backgroundColor: '#2196f3',
						      color: 'white',
						      padding: '0.4rem 0.8rem',
						      fontSize: '0.9rem',
						      border: 'none',
						      borderRadius: '4px'
						    }}
						  >
						    📄 View Details
						  </button>

						  <button
						    onClick={() => deleteWorkout(w.id)}
						    style={{
						      backgroundColor: '#f44336',
						      color: 'white',
						      padding: '0.4rem 0.8rem',
						      fontSize: '0.9rem',
						      border: 'none',
						      borderRadius: '4px'
						    }}
						  >
						    🗑 Delete
						  </button>
						</div>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}
