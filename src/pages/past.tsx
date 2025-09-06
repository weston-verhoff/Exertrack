// src/pages/past.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { deleteWorkoutById } from '../utils/deleteWorkout'
import { Layout } from '../components/Layout'
import { WorkoutCard } from '../components/WorkoutCard'

export default function PastWorkouts() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkouts() {
			const { data, error } = await supabase
			  .from('workouts')
			  .select(`
			    id,
			    date,
			    status,
			    template:template_id(name),
			    workout_exercises (
			      id,
			      sets,
			      reps,
			      weight,
			      exercise:exercise_id(name, target_muscle)
			    )
			  `)
			  .order('date', { ascending: false });


      if (error) console.error('Error fetching workouts:', error)
      else setWorkouts(data || [])

      setLoading(false)
    }

    fetchWorkouts()
  }, [])

  // const getFocusMuscles = (we: any[]) => {
  //   const groups = new Set<string>()
  //   we.forEach(e => groups.add(e.exercise.target_muscle))
  //   return Array.from(groups).join(', ')
  // }

	const deleteWorkout = async (id: string) => {
	  if (!window.confirm('Delete this workout?')) return

	  const success = await deleteWorkoutById(id)

	  if (!success) {
	    alert('Could not delete workout.')
	  } else {
	    setWorkouts(prev => prev.filter(w => w.id !== id))
	  }
	}

	const completedWorkouts = workouts
	  .filter((w) => w.status === 'completed')
	  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());



  return (
    <Layout>
		<div>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>Past Workouts</h1>

      {loading ? (
        <p>Loading...</p>
      ) : workouts.length === 0 ? (
        <p>No workouts found.</p>
      ) : (
				<div className="past-workouts">
					{completedWorkouts.map((w) => (
						<WorkoutCard
							key={w.id}
							workout={w}
							onDelete={deleteWorkout}
							variant="past-workout"
						/>
					))}
				</div>
      )}
			</div>
    </Layout>
  )
}
