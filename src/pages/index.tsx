import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { deleteWorkoutById } from '../utils/deleteWorkout';
import { WorkoutButton } from '../components/WorkoutButton';
import { Layout } from '../components/Layout';


interface WorkoutExercise {
  sets: number;
  reps: number;
  weight: number;
  order: number;
  exercise: {
    name: string;
    target_muscle: string;
  };
}

interface Workout {
  id: string;
  date: string;
  status?: string;
  workout_exercises: WorkoutExercise[];
}

export default function Dashboard() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
            sets,
            reps,
            weight,
            order,
            exercise:exercise_id(name, target_muscle)
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
          })),
        };
      });

      setWorkouts(cleaned);
      setLoading(false);
    }

    fetchWorkouts();
  }, []);

	function formatDateCompact(dateStr: string) {
	  const [year, month, day] = dateStr.split('-').map(Number);
	  const date = new Date(year, month - 1, day); // month is 0-indexed

	  const weekday = new Intl.DateTimeFormat('en-US', {
	    weekday: 'long',
	  }).format(date);

	  const compactDate = new Intl.DateTimeFormat('en-US', {
	    month: 'numeric',
	    day: 'numeric',
	    year: '2-digit',
	  }).format(date);

	  return `${weekday} ${compactDate}`;
	}

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

	return (
	  <Layout padded maxWidth="xl" scrollable>
	    <h1 className="headline">Dashboard</h1>

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
	          <section className="section">
	            <h2>⏳ Scheduled Workouts</h2>
	            {scheduledWorkouts.map((w) => (
	              <div
	                key={w.id}
	                className={`workout-card ${w.id === nextWorkoutId ? 'highlight' : ''}`}
	              >
									<strong title={w.date}>{formatDateCompact(w.date)}</strong>
	                {w.date === today && <span className="accent">← Today</span>}
	                {w.id === nextWorkoutId && <span className="info">🟢 Next Up</span>}
	                <ul>
	                  {w.workout_exercises.map((we, i) => (
	                    <li key={i}>
	                      {we.exercise?.name ?? 'Unknown'} – {we.sets}×{we.reps}
	                    </li>
	                  ))}
	                </ul>

	                <div className="button-group">
	                  <button
	                    className="button"
	                    onClick={() => navigate(`/runner/${w.id}`)}
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

	        <section className="section">
	          <h2>📊 Finished Workouts</h2>
	          {completedWorkouts.length === 0 ? (
	            <p>No completed workouts yet.</p>
	          ) : (
	            completedWorkouts.map((w) => (
	              <div key={w.id} className="workout-card">
	                <strong title={w.date}>{formatDateCompact(w.date)}</strong>
	                {w.date === today && <span className="accent">← Today</span>}
	                <ul>
	                  {w.workout_exercises
	                    .sort((a, b) => a.order - b.order)
	                    .map((we, i) => (
	                      <li key={i}>
	                        {we.exercise?.name ?? 'Unknown'} – {we.sets}×{we.reps} @{' '}
	                        {we.weight ?? 0} lbs
	                      </li>
	                    ))}
	                </ul>
	                <div className="button-group">
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
	            ))
	          )}
	        </section>
	      </>
	    )}
	  </Layout>
	);
}
