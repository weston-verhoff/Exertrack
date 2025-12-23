// src/pages/past.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { deleteWorkoutById } from '../utils/deleteWorkout'
import { Layout } from '../components/Layout'
import { WorkoutCard } from '../components/WorkoutCard'
import { useAuth } from '../context/AuthContext'

export default function PastWorkouts() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true)
	const [showAllPast, setShowAllPast] = useState(false)
  const [loadingAllPast, setLoadingAllPast] = useState(false)
  const [completedTotalCount, setCompletedTotalCount] = useState<number>(0)
	const { userId, loading: authLoading } = useAuth()
	const handleStatusChange = (id: string, status: string) => {
	  setWorkouts(prev =>
	    prev.map(w =>
	      w.id === id ? { ...w, status } : w
	    )
	  );
	};

	const workoutFields = `
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
  `;

  const getTodayString = () => new Date().toISOString().slice(0, 10);

  const cleanWorkouts = (data: any[] | null) =>
    (data ?? []).map(w => ({
      ...w,
      status: w.status ?? (w.date >= getTodayString() ? 'scheduled' : 'completed'),
      workout_exercises: w.workout_exercises.map((we: any) => ({
        ...we,
        exercise: Array.isArray(we.exercise) ? we.exercise[0] : we.exercise,
        workout_sets: we.workout_sets ?? [],
      })),
    }));

  useEffect(() => {
    async function fetchWorkouts() {
			if (!userId) return

			const todayString = getTodayString();
      const [scheduledResponse, completedResponse] = await Promise.all([
        supabase
          .from('workouts')
          .select(workoutFields)
          .eq('user_id', userId)
          .or('status.eq.scheduled,status.is.null')
          .gte('date', todayString)
          .order('date', { ascending: true }),
        supabase
          .from('workouts')
          .select(workoutFields, { count: 'exact' })
          .eq('user_id', userId)
          .or('status.eq.completed,status.is.null')
          .lt('date', todayString)
          .order('date', { ascending: false })
          .limit(9),
      ]);

      if (scheduledResponse.error) console.error('Error fetching scheduled workouts:', scheduledResponse.error)
      if (completedResponse.error) console.error('Error fetching completed workouts:', completedResponse.error)

      const scheduledClean = cleanWorkouts(scheduledResponse.data);
      const completedClean = cleanWorkouts(completedResponse.data);

      setCompletedTotalCount(completedResponse.count ?? completedClean.length);
      setWorkouts([...scheduledClean, ...completedClean])

      setLoading(false)
    }

    if (authLoading) return

    if (!userId) {
      setWorkouts([])
      setLoading(false)
      return
    }

    fetchWorkouts()
  }, [authLoading, userId])

	const deleteWorkout = async (id: string) => {
	  if (!window.confirm('Delete this workout?')) return

		if (!userId) return

	  const success = await deleteWorkoutById(id, userId)

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
			const displayedCompletedWorkouts = showAllPast
	  ? completedWorkouts
	  : completedWorkouts.slice(0, 9);

	const loadAllCompletedWorkouts = async () => {
	  if (loadingAllPast || showAllPast) return

	  setLoadingAllPast(true)
	  const { data, error } = await supabase
	    .from('workouts')
	    .select(workoutFields)
	    .eq('user_id', userId!)
	    .or('status.eq.completed,status.is.null')
	    .lt('date', getTodayString())
	    .order('date', { ascending: false });

	  if (error) {
	    console.error('Error fetching all completed workouts:', error)
	    setLoadingAllPast(false)
	    return
	  }

	  const completedClean = cleanWorkouts(data);
	  setCompletedTotalCount(completedClean.length);
	  setWorkouts(prev => {
	    const scheduled = prev.filter(w => w.status === 'scheduled');
	    const merged = [...scheduled, ...completedClean];
	    const seen = new Set<string>();
	    return merged.filter(w => {
	      if (seen.has(w.id)) return false;
	      seen.add(w.id);
	      return true;
	    });
	  });

	  setShowAllPast(true);
	  setLoadingAllPast(false);
	};


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
      ) : completedWorkouts.length === 0 ? (
        <p>No past workouts found.</p>
      ) : (
				<div className="past-workouts">
					{displayedCompletedWorkouts.map((w) => (
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
					{!showAllPast && completedTotalCount > displayedCompletedWorkouts.length && (
					  <button
					    className="show-all-button"
					    type="button"
					    onClick={loadAllCompletedWorkouts}
					    disabled={loadingAllPast}
					  >
					    {loadingAllPast ? 'Loading...' : 'Show All'}
					  </button>
					)}
				</div>
      )}
			</div>
    </Layout>
  )
}
