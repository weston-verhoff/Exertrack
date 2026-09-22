// src/pages/past.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { WorkoutCard } from '../components/WorkoutCard'
import { WorkoutButton } from '../components/WorkoutButton'
import { WorkoutCardSkeletonGrid } from '../components/LoadingSkeletons'
import { useAuth } from '../context/AuthContext'
import { getAccountSettings } from '../services/accountService'
import { fetchWorkoutExportData } from '../services/workoutExportService'
import {
  fetchAllCompletedWorkouts,
  fetchWorkoutOverview,
} from '../services/workoutService'
import { confirmAndDeleteWorkout } from '../utils/workoutActions'
import { useSystemAlerts } from '../context/SystemAlertContext'
import {
  buildWorkoutExportFilename,
  downloadTextFile,
  filterWorkoutsForExport,
  formatWorkoutsAsText,
  WorkoutExportScope,
} from '../utils/workoutExport'
import { getWeekStartDateKey } from '../utils/accountMetrics'

const EXPORT_MESSAGES: Record<WorkoutExportScope, { exporting: string; exported: string }> = {
  all: {
    exporting: 'Exporting all workouts...',
    exported: 'Exported all workouts.',
  },
  planned: {
    exporting: 'Exporting planned workouts...',
    exported: 'Exported planned workouts.',
  },
  past: {
    exporting: 'Exporting all past workouts...',
    exported: 'Exported all past workouts.',
  },
  'this-week': {
    exporting: "Exporting this week's workouts...",
    exported: "Exported this week's workouts.",
  },
  '2-weeks': {
    exporting: 'Exporting last 2 weeks...',
    exported: 'Exported last 2 weeks.',
  },
}

export default function PastWorkouts() {
  const navigate = useNavigate()
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true)
	const [showAllPast, setShowAllPast] = useState(false)
  const [loadingAllPast, setLoadingAllPast] = useState(false)
  const [completedTotalCount, setCompletedTotalCount] = useState<number>(0)
  const [exportingScope, setExportingScope] = useState<WorkoutExportScope | null>(null)
	const { user, userId, loading: authLoading } = useAuth()
	const { showAlert } = useSystemAlerts()
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
		      showAlert(error, { tone: 'error' })
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

  const exportWorkouts = async (
    scope: WorkoutExportScope
  ) => {
    if (!user || !userId || exportingScope) return

    setExportingScope(scope)
    showAlert(EXPORT_MESSAGES[scope].exporting, {
      replaceKey: 'workout-export',
      duration: 300000,
    })

    try {
      const { data, error } = await fetchWorkoutExportData({ userId })

      if (error || !data) {
        showAlert(error ?? 'Failed to export workouts. Please try again.', {
          tone: 'error',
          replaceKey: 'workout-export',
        })
        return
      }

      const exportDate = new Date()
      const filteredWorkouts = filterWorkoutsForExport({
        workouts: data,
        scope,
        today: exportDate,
        weekStart: getWeekStartDateKey(
          getAccountSettings(user).startOfWeek,
          exportDate
        ),
      })

      if (filteredWorkouts.length === 0) {
        showAlert('No workouts are available for this export.', {
          tone: 'error',
          replaceKey: 'workout-export',
        })
        return
      }

      downloadTextFile({
        content: formatWorkoutsAsText(filteredWorkouts),
        filename: buildWorkoutExportFilename(scope, exportDate),
      })
      showAlert(EXPORT_MESSAGES[scope].exported, {
        tone: 'success',
        replaceKey: 'workout-export',
      })
    } catch (error) {
      console.error('Failed to export workouts.', error)
      showAlert('Failed to export workouts. Please try again.', {
        tone: 'error',
        replaceKey: 'workout-export',
      })
    } finally {
      setExportingScope(null)
    }
  }

  return (
    <Layout>
		<div className="past-workouts-page">
			<h2 style={{textAlign:'center'}}>Future Workouts</h2>
			<div className="workout-export-links" aria-label="Future workout exports">
				<WorkoutButton
					label="Export All"
					disabled={!userId || exportingScope !== null}
					variant="completedSectionLink"
					size="md"
					tone="selection"
					onClick={() => exportWorkouts('all')}
				/>
				<span aria-hidden="true">|</span>
				<WorkoutButton
					label="Export Planned Workouts"
					disabled={!userId || exportingScope !== null}
					variant="completedSectionLink"
					size="md"
					tone="selection"
					onClick={() => exportWorkouts('planned')}
				/>
			</div>
			{loading ? (
        <div style={{marginBottom:"4rem"}}>
          <WorkoutCardSkeletonGrid rows={1} label="Loading future workouts" />
        </div>
      ) : scheduledWorkouts.length === 0 ? (
        <div className="past-workouts" style={{marginBottom:"4rem"}}>
          <button
            type="button"
            data-tone="workout"
            className="empty-workout-card"
            onClick={() => navigate('/plan')}
          >
            <span className="empty-workout-card-text">
              Get started / plan your next workout
            </span>
          </button>
        </div>
      ) : (
				<div className="past-workouts" style={{marginBottom:"4rem"}}>
					{scheduledWorkouts.map((w) => (
						<WorkoutCard
							key={w.id}
							workout={w}
							tone="workout"
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
      <div className="workout-export-links" aria-label="Past workout exports">
        <WorkoutButton
          label="Export All Past Workouts"
          disabled={!userId || exportingScope !== null}
          variant="completedSectionLink"
          size="md"
          tone="selection"
          onClick={() => exportWorkouts('past')}
        />
        <span aria-hidden="true">|</span>
        <WorkoutButton
          label="Export This Week"
          disabled={!userId || exportingScope !== null}
          variant="completedSectionLink"
          size="md"
          tone="selection"
          onClick={() => exportWorkouts('this-week')}
        />
        <span aria-hidden="true">|</span>
        <WorkoutButton
          label="Export 2 weeks"
          disabled={!userId || exportingScope !== null}
          variant="completedSectionLink"
          size="md"
          tone="selection"
          onClick={() => exportWorkouts('2-weeks')}
        />
      </div>
      {loading ? (
        <WorkoutCardSkeletonGrid rows={1} label="Loading past workouts" />
      ) : completedWorkouts.length === 0 ? (
        <p>No past workouts found.</p>
      ) : (
				<>
					<div className="past-workouts">
									{displayedCompletedWorkouts.map((w) => (
										<WorkoutCard
											key={w.id}
											workout={w}
											tone="workout"
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
							<WorkoutButton
								label="Show All"
								loadingLabel="Loading..."
								loading={loadingAllPast}
								variant="secondary"
								size="lg"
								tone="selection"
								onClick={loadAllCompletedWorkouts}
							/>
						</div>
					)}
				</>
      )}
			</div>
    </Layout>
  )
}
