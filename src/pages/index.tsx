import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { deleteWorkoutById } from '../utils/deleteWorkout';
import { WorkoutButton } from '../components/WorkoutButton';
import { WorkoutCard } from '../components/WorkoutCard';
import { motion } from 'framer-motion'; // ✅ Import motion
import { Workout } from '../types/workout';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
	const [loadingAllPast, setLoadingAllPast] = useState(false);
  const navigate = useNavigate();
  const futureRef = useRef<HTMLDivElement>(null);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });
	const [drawerOpen, setDrawerOpen] = useState(false);
  const { userId, loading: authLoading } = useAuth();
  const [showAllPast, setShowAllPast] = useState(false);
  const [completedTotalCount, setCompletedTotalCount] = useState<number>(0);

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
	const getLocalDateString = useCallback(() => {
	  const now = new Date();
	  const year = now.getFullYear();
	  const month = String(now.getMonth() + 1).padStart(2, '0');
	  const day = String(now.getDate()).padStart(2, '0');
	  return `${year}-${month}-${day}`;
	}, []);

	const cleanWorkouts = useCallback(
  (data: any[] | null) => {
    const today = getLocalDateString();

    return (data ?? []).map((w: any) => ({
      ...w,
      status:
        w.status ??
        (w.date >= today ? 'scheduled' : 'completed'),
      workout_exercises: w.workout_exercises.map((we: any) => ({
        ...we,
        exercise:
          we.exercise && typeof we.exercise === 'object'
            ? Array.isArray(we.exercise)
              ? we.exercise[0]
              : we.exercise
            : null,
        workout_sets: we.workout_sets ?? [],
      })),
    }));
  },
  [getLocalDateString]
);

		const fetchInitialWorkouts = useCallback(
	  async (currentUserId: string) => {
	    const todayString = getLocalDateString();

	    const [scheduledResponse, completedResponse] = await Promise.all([
	      supabase
	        .from('workouts')
	        .select(workoutFields)
	        .eq('user_id', currentUserId)
	        .or('status.eq.scheduled,status.is.null')
	        .gte('date', todayString)
	        .order('date', { ascending: true }),

	      supabase
	        .from('workouts')
	        .select(workoutFields, { count: 'exact' })
	        .eq('user_id', currentUserId)
	        .or('status.eq.completed,status.is.null')
	        .lt('date', todayString)
	        .order('date', { ascending: false })
	        .limit(9),
	    ]);

	    if (scheduledResponse.error) {
	      console.error('Error fetching scheduled workouts:', scheduledResponse.error);
	    }

	    if (completedResponse.error) {
	      console.error('Error fetching completed workouts:', completedResponse.error);
	    }

	    const scheduledClean = cleanWorkouts(scheduledResponse.data);
	    const completedClean = cleanWorkouts(completedResponse.data);

	    setCompletedTotalCount(
	      completedResponse.count ?? completedClean.length
	    );

	    setWorkouts([...scheduledClean, ...completedClean]);
	    setLoading(false);
	  },
	  [workoutFields, cleanWorkouts, getLocalDateString]
	);

  useEffect(() => {

    if (authLoading) return;

    if (!userId) {
      setWorkouts([]);
      setLoading(false);
      return;
    }

    fetchInitialWorkouts(userId);
  }, [authLoading, userId, fetchInitialWorkouts ]);

  // ✅ Dynamically calculate drag constraints when workouts change
  useEffect(() => {
    if (futureRef.current) {
      const scrollWidth = futureRef.current.scrollWidth;
      const clientWidth = futureRef.current.clientWidth;
      setConstraints({ left: -(scrollWidth - clientWidth), right: 0 });
    }
  }, [workouts]);

  const deleteWorkout = async (id: string) => {
    if (!window.confirm('Delete this workout permanently?')) return;

    if (!userId) return;

    const success = await deleteWorkoutById(id, userId);

    if (!success) {
      alert('Unable to delete workout.');
    } else {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    }
  };

  const today = getLocalDateString();

  const scheduledWorkouts = workouts
    .filter((w) => w.status === 'scheduled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const completedWorkouts = workouts
    .filter((w) => w.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // descending

  const nextWorkoutId = scheduledWorkouts[0]?.id;
	const nextWorkout = scheduledWorkouts[0];
	const loadAllCompletedWorkouts = async () => {
    if (loadingAllPast || showAllPast) return;
    setLoadingAllPast(true);

    const { data, error } = await supabase
      .from('workouts')
      .select(workoutFields)
      .eq('user_id', userId!)
      .or('status.eq.completed,status.is.null')
      .lt('date', getLocalDateString())
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching all completed workouts:', error);
      setLoadingAllPast(false);
      return;
    }

    const completedClean = cleanWorkouts(data);
    setCompletedTotalCount(completedClean.length);

    setWorkouts((prev) => {
      const scheduled = prev.filter((w) => w.status === 'scheduled');
      const merged = [...scheduled, ...completedClean];
      const seen = new Set<string>();
      return merged.filter((w) => {
        if (seen.has(w.id)) return false;
        seen.add(w.id);
        return true;
      });
    });

    setShowAllPast(true);
    setLoadingAllPast(false);
  };

	const displayedCompletedWorkouts = showAllPast
    ? completedWorkouts
    : completedWorkouts.slice(0, 9);

  return (
    <div className="clearfix">
      <div className='dashboardHero'>
				<div className="dash-content">
        <h1 className="headline font-white">EzExTrack</h1>
					<div className="dashboard-buttons">
					{nextWorkoutId && (
					  <WorkoutButton
					    label="Start Next Workout"
					    icon="▶️"
					    variant="accent"
					    onClick={() => navigate(`/runner/${nextWorkoutId}`)}
					  />
					)}

	        <WorkoutButton
	          label="Plan New Session"
	          icon="➕"
	          variant="info"
	          onClick={() => navigate('/plan')}
	        />
					</div>
				</div>
				{nextWorkout && (
				  <WorkoutCard
				    workout={nextWorkout}
						onDelete={deleteWorkout}
						variant="highlighted"
						onStatusChange={handleStatusChange}
						onWorkoutUpdated={updatedWorkout => {
				    setWorkouts(prev =>
				      prev.map(w =>
				        w.id === updatedWorkout.id ? updatedWorkout : w
				      )
				    );
				  }}
				  />
				)}
      </div>
      {loading ? (
        <p>Loading workouts...</p>
      ) : (
        <>
          {/* FUTURE WORKOUTS with drag scrolling */}
					<div className="future-workouts">
					<motion.div
					  ref={futureRef}
					  className="drag-future-workouts"
					  drag={drawerOpen ? false : "x"}
					  dragConstraints={constraints}
					  dragElastic={0.05}
					  style={{
					    pointerEvents: drawerOpen ? "none" : "auto",
					  }}
					>

            {scheduledWorkouts.map((w) => (
              <WorkoutCard
                key={w.id}
                workout={w}
                onDelete={deleteWorkout}
								variant="future-workout"
								onStatusChange={handleStatusChange}
								onDrawerOpen={() => setDrawerOpen(true)}
							  onDrawerClose={() => setDrawerOpen(false)}
								onWorkoutUpdated={updatedWorkout => {
						    setWorkouts(prev =>
						      prev.map(w =>
						        w.id === updatedWorkout.id ? updatedWorkout : w
						      )
						    );
						  }}
              />
            ))}
          </motion.div>
					</div>
          {/* COMPLETED WORKOUTS */}
          <section className="past-workout-container">
            <h2 className="font-white">Finished Workouts</h2>
            {completedWorkouts.length === 0 ? (
              <p>No completed workouts yet.</p>
            ) : (
              <div className="past-workouts">
                {displayedCompletedWorkouts.map((w) => (
                  <WorkoutCard
                    key={w.id}
                    workout={w}
                    isToday={w.date === today}
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
          </section>
        </>
      )}
    </div>
  );
}
