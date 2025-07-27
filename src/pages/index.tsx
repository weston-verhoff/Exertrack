import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { useNavigate } from 'react-router-dom'
import { deleteWorkoutById } from '../utils/deleteWorkout'
import { WorkoutButton } from '../components/WorkoutButton'


interface WorkoutExercise {
  sets: number
  reps: number
  weight: number
  order: number
  exercise: {
    name: string
    target_muscle: string
  }
}

interface Workout {
  id: string
  date: string
  status?: string
  workout_exercises: WorkoutExercise[]
}

export default function Dashboard() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function fetchWorkouts() {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          status,
          workout_exercises (
            sets,
            reps,
            weight,
            order,
            exercise:exercise_id(name, target_muscle)
          )
        `)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error fetching workouts:', error)
        return
      }
			//Mapping block according to CoPilot
			const cleaned = (data ?? []).map((w: any) => {
			  const workoutDate = w.date
			  const isFutureOrToday = workoutDate >= today

			  return {
			    ...w,
			    status: w.status ?? (isFutureOrToday ? 'scheduled' : 'completed'),
			    workout_exercises: w.workout_exercises.map((we: any) => ({
			      ...we,
			      exercise: we.exercise && typeof we.exercise === 'object'
			        ? Array.isArray(we.exercise) ? we.exercise[0] : we.exercise
			        : null
			    }))
			  }
			})
			console.log('Mapped workout_exercises:', cleaned.map(w => w.workout_exercises))

      setWorkouts(cleaned)
      setLoading(false)
    }

    fetchWorkouts()
  }, [])

	const deleteWorkout = async (id: string) => {
	  if (!window.confirm('Delete this workout permanently?')) return

	  const success = await deleteWorkoutById(id)

	  if (!success) {
	    alert('Unable to delete workout.')
	  } else {
	    setWorkouts(prev => prev.filter(w => w.id !== id))
	  }
	}


  const scheduledWorkouts = workouts.filter(w => w.status === 'scheduled')
  const completedWorkouts = workouts.filter(w => w.status === 'completed')

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>Dashboard</h1>

			<WorkoutButton
				label="Plan New Session"
				icon="➕"
				variant="info"
				onClick={() => navigate('/plan')}
				/>

      {loading ? (
        <p>Loading workouts...</p>
      ) : (
        <>
          {scheduledWorkouts.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2>⏳ Scheduled Workouts</h2>
              {scheduledWorkouts.map(w => (
                <div key={w.id} style={{ padding: '0.5rem', borderBottom: '1px solid #ccc' }}>
                  <strong>{w.date}</strong>
                  {w.date === today && (
                    <span style={{ color: 'var(--accent-color)', marginLeft: '0.5rem' }}>← Today</span>
                  )}
                  <ul>
                    {w.workout_exercises.map((we, i) => (
                      <li key={i}>
                        {we.exercise?.name ?? 'Unknown'} – {we.sets}×{we.reps}
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => navigate(`/runner/${w.id}`)}
                      style={{
                        backgroundColor: 'var(--info-color)',
                        color: 'white',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.9rem',
                        border: 'none',
                        borderRadius: '4px'
                      }}
                    >
                      ▶️ Start Workout
											</button>
											<WorkoutButton
											  label="View Details"
											  icon="📄"
											  variant="info"
											  onClick={() => navigate(`/workout/${w.id}`)}
											/>
											<WorkoutButton
											  label="Delete"
											  icon="🗑"
											  variant="accent"
											  onClick={() => deleteWorkout(w.id)}
											/>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section>
            <h2>📊 Finished Workouts</h2>
            {completedWorkouts.length === 0 ? (
              <p>No completed workouts yet.</p>
            ) : (
              completedWorkouts.map(w => (
                <div key={w.id} style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>
                  <strong>{w.date}</strong>
                  {w.date === today && (
                    <span style={{ color: 'var(--accent-color)', marginLeft: '0.5rem' }}>← Today</span>
                  )}
                  <ul>
                    {w.workout_exercises
                      .sort((a, b) => a.order - b.order)
                      .map((we, i) => (
                        <li key={i}>
                          {we.exercise?.name ?? 'Unknown'} – {we.sets}×{we.reps} @ {we.weight ?? 0} lbs
                        </li>
                      ))}
                  </ul>
									<WorkoutButton
									  label="View Details"
									  icon="📄"
									  variant="info"
									  onClick={() => navigate(`/workout/${w.id}`)}
									/>
									<WorkoutButton
									  label="Delete"
									  icon="🗑"
									  variant="accent"
									  onClick={() => deleteWorkout(w.id)}
									/>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  )
}
