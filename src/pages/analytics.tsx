import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Layout } from '../components/Layout'
import { fetchAnalyticsWorkouts } from '../services/workoutService'
import { distanceToMeters } from '../utils/cardio'
import { DistanceUnit } from '../types/workout'


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface WorkoutExercise {
  sets: number
  reps: number | null
  weight: number | null
  duration_seconds?: number | null
  distance_value?: number | null
  distance_unit?: DistanceUnit | null
  workout_sets?: Array<{ duration_seconds?: number | null; distance_value?: number | null; distance_unit?: DistanceUnit | null }>
  exercise: {
    name: string
    target_muscle: string
    exercise_type: 'strength' | 'cardio'
  }
}

interface Workout {
  id: string
  date: string
  workout_exercises: WorkoutExercise[]
}

export default function AnalyticsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const { userId, loading: authLoading } = useAuth()

  useEffect(() => {
    async function fetchWorkouts() {
      if (!userId) return

			const { data, error } = await fetchAnalyticsWorkouts({ userId })

      if (error || !data) {
        console.error(error ?? 'Error fetching workouts.')
        setLoading(false)
        return
      }

      setWorkouts(data)
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

  const volumeByDate: Record<string, number> = {}

  workouts.forEach(w => {
    const date = w.date
    let total = 0

    w.workout_exercises.forEach(we => {
      if (we.exercise.exercise_type === 'strength' && (selectedMuscle === 'all' || we.exercise.target_muscle === selectedMuscle)) {
        total += we.sets * Number(we.reps ?? 0) * Number(we.weight ?? 0)
      }
    })

    volumeByDate[date] = (volumeByDate[date] || 0) + total
  })

  const chartData = {
    labels: Object.keys(volumeByDate),
    datasets: [
      {
        label: selectedMuscle === 'all' ? 'Total Volume' : `${selectedMuscle} Volume`,
        data: Object.values(volumeByDate),
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        tension: 0.3
      }
    ]
  }

  const cardioByDate = workouts.reduce<Record<string, { minutes: number; kilometers: number }>>((totals, workout) => {
    const current = totals[workout.date] ?? { minutes: 0, kilometers: 0 }
    workout.workout_exercises.filter(ex => ex.exercise.exercise_type === 'cardio').forEach(ex => {
      const segments = ex.workout_sets?.length ? ex.workout_sets : [ex]
      segments.forEach(segment => {
        current.minutes += Number(segment.duration_seconds ?? 0) / 60
        current.kilometers += distanceToMeters(segment.distance_value, segment.distance_unit) / 1000
      })
    })
    totals[workout.date] = current
    return totals
  }, {})

  const cardioChartData = {
    labels: Object.keys(cardioByDate),
    datasets: [
      { label: 'Cardio Minutes', data: Object.values(cardioByDate).map(value => value.minutes), borderColor: '#ff7a00', backgroundColor: 'rgba(255,122,0,.2)', tension: 0.3 },
      { label: 'Distance (km)', data: Object.values(cardioByDate).map(value => value.kilometers), borderColor: '#4bc0c0', backgroundColor: 'rgba(75,192,192,.2)', tension: 0.3 }
    ]
  }

  const muscleGroups = Array.from(
    new Set(
      workouts.flatMap(w =>
        w.workout_exercises.filter(we => we.exercise.exercise_type === 'strength').map(we => we.exercise.target_muscle)
      )
    )
  )

  return (
    <Layout>
      <h1>📊 Training Analytics</h1>

      <label htmlFor="muscle-select">Filter by Muscle Group:</label>
      <select
        id="muscle-select"
        value={selectedMuscle}
        onChange={e => setSelectedMuscle(e.target.value)}
        style={{ marginLeft: '0.5rem', marginBottom: '1rem' }}
      >
        <option value="all">All Muscles</option>
        {muscleGroups.map((muscle, i) => (
          <option key={i} value={muscle}>{muscle}</option>
        ))}
      </select>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <>
          <h2>Strength volume</h2>
          <Line data={chartData} />
          <h2>Cardio</h2>
          <Line data={cardioChartData} />
        </>
      )}
    </Layout>
  )
}
