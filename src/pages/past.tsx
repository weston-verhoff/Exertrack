// src/pages/past.tsx
import React, { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { WorkoutCard } from '../components/WorkoutCard'
import { useAuth } from '../context/AuthContext'
import { fetchWorkoutExportData } from '../services/workoutExportService'
import {
  fetchAllCompletedWorkouts,
  fetchWorkoutOverview,
} from '../services/workoutService'
import { confirmAndDeleteWorkout } from '../utils/workoutActions'
import {
  buildWorkoutExportFilename,
  downloadTextFile,
  formatWorkoutsAsText,
} from '../utils/workoutExport'

export default function PastWorkouts() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true)
	const [showAllPast, setShowAllPast] = useState(false)
  const [loadingAllPast, setLoadingAllPast] = useState(false)
  const [completedTotalCount, setCompletedTotalCount] = useState<number>(0)
  const [exportingWorkouts, setExportingWorkouts] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
	const { userId, loading: authLoading } = useAuth()
	const handleStatusChange = (id: string, status: string) => {
	  setWorkouts(prev =>
	    prev.map(w =>
	      w.id === id ? { ...w, status } : w
	    )
	  );
	};

  useEffect(() => {
    async function fetchWorkouts() {
			if (!userId) return

			const { data, error } = await fetchWorkoutOverview({
        userId,
        includeTemplate: true,
      });

      if (error || !data) {
        console.error(error ?? 'Error fetching workouts.');
        setLoading(false)
        return
      }

      setCompletedTotalCount(data.completedCount)
      setWorkouts([...data.scheduled, ...data.completed])

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
		if (!userId) return
		const { deleted, error } = await confirmAndDeleteWorkout({
		      workoutId: id,
		      userId,
		      confirmationMessage: 'Delete this workout?',
		    })

		    if (error) {
		      alert(error)
		      return
		    }

		    if (deleted) {
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
		const { data, error } = await fetchAllCompletedWorkouts({
      userId: userId!,
      includeTemplate: true,
    })

	  if (error || !data) {
	    console.error(error ?? 'Error fetching all completed workouts.')
	    setLoadingAllPast(false)
	    return
	  }

		setCompletedTotalCount(data.length)
	  setWorkouts(prev => {
	    const scheduled = prev.filter(w => w.status === 'scheduled')
	    const merged = [...scheduled, ...data]
	    const seen = new Set<string>()
	    return merged.filter(w => {
	      if (seen.has(w.id)) return false
	      seen.add(w.id)
	      return true
	    })
	  })

	  setShowAllPast(true)
	  setLoadingAllPast(false)
	};

  const exportAllWorkouts = async () => {
    if (!userId || exportingWorkouts) return

    setExportingWorkouts(true)
    setExportError(null)

    try {
      const { data, error } = await fetchWorkoutExportData({ userId })

      if (error || !data) {
        setExportError(error ?? 'Failed to export workouts. Please try again.')
        return
      }

      if (data.length === 0) {
        setExportError('No workouts are available to export.')
        return
      }

      downloadTextFile({
        content: formatWorkoutsAsText(data),
        filename: buildWorkoutExportFilename(),
      })
    } catch (error) {
      console.error('Failed to export workouts.', error)
      setExportError('Failed to export workouts. Please try again.')
    } finally {
      setExportingWorkouts(false)
    }
  }

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
      <div style={{display:'flex', justifyContent:'center', marginBottom:'1rem'}}>
        <button
          className="show-all-button"
          type="button"
          onClick={exportAllWorkouts}
          disabled={exportingWorkouts || !userId}
        >
          {exportingWorkouts ? 'Exporting...' : 'Export All'}
        </button>
      </div>
      {exportError && (
        <p role="alert" style={{textAlign:'center'}}>{exportError}</p>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : completedWorkouts.length === 0 ? (
        <p>No past workouts found.</p>
      ) : (
				<>
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
			</div>
    </Layout>
  )
}
