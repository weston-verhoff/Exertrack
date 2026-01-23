import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkoutButton } from '../components/WorkoutButton';
import { WorkoutCard } from '../components/WorkoutCard';
import { motion } from 'framer-motion'; // ✅ Import motion
import { Workout } from '../types/workout';
import { useAuth } from '../context/AuthContext';
import {
  fetchAllCompletedWorkouts,
  fetchWorkoutOverview,
  getLocalDateString,
} from '../services/workoutService';
import { confirmAndDeleteWorkout } from '../utils/workoutActions';

export default function Dashboard() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
	const [loadingAllPast, setLoadingAllPast] = useState(false);
  const navigate = useNavigate();
	const futureContainerRef = useRef<HTMLDivElement>(null);
  const futureRef = useRef<HTMLDivElement>(null);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });
	const [drawerOpen, setDrawerOpen] = useState(false);
  const { userId, loading: authLoading } = useAuth();
	const [isOverflowing, setIsOverflowing] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const [completedTotalCount, setCompletedTotalCount] = useState<number>(0);

	const handleStatusChange = (id: string, status: string) => {
	  setWorkouts(prev =>
	    prev.map(w =>
	      w.id === id ? { ...w, status } : w
	    )
	  );
	};

		const fetchInitialWorkouts = useCallback(
	  async (currentUserId: string) => {
			const { data, error } = await fetchWorkoutOverview({
        userId: currentUserId,
      });
			if (error || !data) {
        console.error(error ?? 'Error fetching workouts.');
        setLoading(false);
        return;
      }

      setCompletedTotalCount(data.completedCount);
      setWorkouts([...data.scheduled, ...data.completed]);
      setLoading(false);
	  },
	  []
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
		if (futureRef.current && futureContainerRef.current) {
      const contentWidth = futureRef.current.scrollWidth;
      const containerWidth = futureContainerRef.current.clientWidth;
      const maxDrag = Math.max(0, contentWidth - containerWidth);
      setConstraints({ left: -maxDrag, right: 0 });
      setIsOverflowing(contentWidth > containerWidth);
    }
  }, [workouts]);

  const deleteWorkout = async (id: string) => {
    if (!userId) return;
		const { deleted, error } = await confirmAndDeleteWorkout({
      workoutId: id,
      userId,
      confirmationMessage: 'Delete this workout permanently?',
    });

    if (error) {
      alert(error);
      return;
    }

    if (deleted) {
      setWorkouts(prev => prev.filter(w => w.id !== id));
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
	const hasScheduledWorkouts = scheduledWorkouts.length > 0;

  const renderEmptyWorkoutCard = (className?: string) => (
    <button
      type="button"
      className={`empty-workout-card${className ? ` ${className}` : ''}`}
      onClick={() => navigate('/plan')}
    >
      <span className="empty-workout-card-text">
        Get started / plan your next workout
      </span>
    </button>
  );

	const loadAllCompletedWorkouts = async () => {
    if (loadingAllPast || showAllPast) return;
    setLoadingAllPast(true);

    const { data, error } = await fetchAllCompletedWorkouts({ userId: userId! });

		if (error || !data) {
      console.error(error ?? 'Error fetching all completed workouts.');
      setLoadingAllPast(false);
      return;
    }

    setCompletedTotalCount(data.length);

		setWorkouts(prev => {
      const scheduled = prev.filter(w => w.status === 'scheduled');
      const merged = [...scheduled, ...data];
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

					{hasScheduledWorkouts && (
             <WorkoutButton
               label="Plan New Session"
               icon="➕"
               variant="info"
               onClick={() => navigate('/plan')}
             />
           )}

					</div>
				</div>
				{nextWorkout ? (
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
				) : (
          renderEmptyWorkoutCard('empty-workout-card--hero')
        )}
      </div>
      {loading ? (
        <p>Loading workouts...</p>
      ) : (
        <>
          {/* FUTURE WORKOUTS with drag scrolling */}
					<div className="future-workouts" ref={futureContainerRef}>
					<div className="future-workouts-header">
						<h2 className="headline font-black">Future Workouts</h2>
						<WorkoutButton
		          label="See All"
		          icon=""
		          variant="blackText"
		          onClick={() => navigate('/past')}
		        />
					</div>
					<motion.div
					  ref={futureRef}
					  className={`drag-future-workouts${isOverflowing ? ' is-overflowing' : ' is-centered'}`}
					  drag={drawerOpen ? false : "x"}
					  dragConstraints={constraints}
					  dragElastic={0.05}
					  style={{
					    pointerEvents: drawerOpen ? "none" : "auto",
					  }}
					>

					{scheduledWorkouts.length > 0 ? (
						scheduledWorkouts.map((w) => (
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
						))
					) : (
						renderEmptyWorkoutCard()
					)}

          </motion.div>
					</div>
          {/* COMPLETED WORKOUTS */}
          <section className="past-workout-container">
            <h2 className="font-white">Finished Workouts</h2>
            {completedWorkouts.length === 0 ? (
              <p>No completed workouts yet.</p>
            ) : (
							<>
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
                </div>
                  {!showAllPast && completedTotalCount > displayedCompletedWorkouts.length && (
                  <div className="past-workouts-footer">
                    <button
                      className="show-all-button"
                      type="button"
                      onClick={loadAllCompletedWorkouts}
                      disabled={loadingAllPast}
                    >
                      {loadingAllPast ? 'Loading...' : 'Show All'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
