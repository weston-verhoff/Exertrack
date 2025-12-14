import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { deleteWorkoutById } from '../utils/deleteWorkout';
import { WorkoutButton } from '../components/WorkoutButton';
import { WorkoutCard } from '../components/WorkoutCard';
import { motion } from 'framer-motion'; // ✅ Import motion
import { Workout } from '../types/workout';

export default function Dashboard() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const futureRef = useRef<HTMLDivElement>(null);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });
	const [drawerOpen, setDrawerOpen] = useState(false);

	const handleStatusChange = (id: string, status: string) => {
	  setWorkouts(prev =>
	    prev.map(w =>
	      w.id === id ? { ...w, status } : w
	    )
	  );
	};

  useEffect(() => {
    const today = getLocalDateString();

    async function fetchWorkouts() {
			const { data, error } = await supabase
		  .from('workouts')
		  .select(`
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
		  `)
		  .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching workouts:', error);
        return;
      }

      const cleaned = (data ?? []).map((w: any) => {
        const workoutDate = w.date;
        const isFutureOrToday = workoutDate >= today;

        return {
          ...w,
          status: w.status ?? (isFutureOrToday ? 'scheduled' : 'completed'),
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
        };
      });

      setWorkouts(cleaned);
      setLoading(false);
    }

    fetchWorkouts();
  }, []);

  // ✅ Dynamically calculate drag constraints when workouts change
  useEffect(() => {
    if (futureRef.current) {
      const scrollWidth = futureRef.current.scrollWidth;
      const clientWidth = futureRef.current.clientWidth;
      setConstraints({ left: -(scrollWidth - clientWidth), right: 0 });
    }
  }, [workouts]);

  function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // e.g. "2025-07-29"
  }

  const deleteWorkout = async (id: string) => {
    if (!window.confirm('Delete this workout permanently?')) return;

    const success = await deleteWorkoutById(id);

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
                {completedWorkouts.map((w) => (
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
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
