import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
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


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface WorkoutExercise {
  sets: number
  reps: number
  weight: number
  exercise: {
    name: string
    target_muscle: string
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

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          workout_exercises (
            sets,
            reps,
            weight,
            exercise:exercise_id(name, target_muscle)
          )
        `)
        .neq('status', 'canceled')
        .eq('user_id', userId)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching workouts:', error)
        return
      }

      const cleaned = (data ?? []).map((w: any) => ({
        ...w,
        workout_exercises: w.workout_exercises.map((we: any) => ({
          ...we,
          exercise: Array.isArray(we.exercise) ? we.exercise[0] : we.exercise
        }))
      }))

      setWorkouts(cleaned)
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
      if (selectedMuscle === 'all' || we.exercise.target_muscle === selectedMuscle) {
        total += we.sets * we.reps * (we.weight ?? 0)
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

  const muscleGroups = Array.from(
    new Set(
      workouts.flatMap(w =>
        w.workout_exercises.map(we => we.exercise.target_muscle)
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
        <Line data={chartData} />
      )}
    </Layout>
  )
}
