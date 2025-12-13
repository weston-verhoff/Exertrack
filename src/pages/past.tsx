// src/pages/past.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { deleteWorkoutById } from '../utils/deleteWorkout'
import { Layout } from '../components/Layout'
import { WorkoutCard } from '../components/WorkoutCard'

export default function PastWorkouts() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true)
	const handleStatusChange = (id: string, status: string) => {
	  setWorkouts(prev =>
	    prev.map(w =>
	      w.id === id ? { ...w, status } : w
	    )
	  );
	};

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
			      order,
			      exercise:exercise_id (
			        id,
			        name,
			        target_muscle
			      ),
			      workout_sets (
			        id,
			        set_number,
			        reps,
			        weight,
			        intensity_type
			      )
			    )
			  `)
			  .order('date', { ascending: false });
				const cleaned = (data ?? []).map(w => ({
				  ...w,
				  workout_exercises: w.workout_exercises.map(we => ({
				    ...we,
				    exercise: Array.isArray(we.exercise) ? we.exercise[0] : we.exercise,
				    workout_sets: we.workout_sets ?? [],
				  })),
				}));

				setWorkouts(cleaned);

      if (error) console.error('Error fetching workouts:', error)
      else setWorkouts(data || [])

      setLoading(false)
    }

    fetchWorkouts()
  }, [])

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
	const scheduledWorkouts = workouts
	    .filter((w) => w.status === 'scheduled')
	    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());



  return (
    <Layout>
		<div style={{display:'flex', flexDirection:'column'}}>
			<h2 style={{textAlign:'center'}}>Future Workouts</h2>
			{loading ? (
        <p>Loading...</p>
      ) : workouts.length === 0 ? (
        <p>No past workouts found.</p>
      ) : (
				<div className="past-workouts" style={{marginBottom:"4rem"}}>
					{scheduledWorkouts.map((w) => (
						<WorkoutCard
							key={w.id}
							workout={w}
							onDelete={deleteWorkout}
							variant="future-workout"
							onStatusChange={handleStatusChange}
							onWorkoutUpdated={updatedWorkout => {
				    setWorkouts(prev =>
				      prev.map(w =>
				        w.id === updatedWorkout.id ? updatedWorkout : w
				      )
				    );
				  }}
						/>
					))}
				</div>
      )}
			<h2 style={{textAlign:'center'}}>Past Workouts</h2>
      {loading ? (
        <p>Loading...</p>
      ) : workouts.length === 0 ? (
        <p>No past workouts found.</p>
      ) : (
				<div className="past-workouts">
					{completedWorkouts.map((w) => (
						<WorkoutCard
							key={w.id}
							workout={w}
							onDelete={deleteWorkout}
							variant="past-workout"
							onStatusChange={handleStatusChange}
							onWorkoutUpdated={updatedWorkout => {
					    setWorkouts(prev =>
					      prev.map(w =>
					        w.id === updatedWorkout.id ? updatedWorkout : w
					      )
					    );
					  }}
						/>
					))}
				</div>
      )}
			</div>
    </Layout>
  )
}
