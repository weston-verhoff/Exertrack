// components/WorkoutCard.tsx
import { useNavigate } from 'react-router-dom'
import { WorkoutButton } from './WorkoutButton'
import '../styles/WorkoutCard.css'

interface WorkoutExercise {
  sets: number
  reps: number
  weight: number
  order: number
  exercise: {
    name: string
    target_muscle: string
  }
}

interface Workout {
  id: string
  date: string
  status?: string
  workout_exercises: WorkoutExercise[]
}

interface Props {
  workout: Workout
  isNext?: boolean
  isToday?: boolean
  onDelete: (id: string) => void
}

export function WorkoutCard({ workout, isNext, isToday, onDelete }: Props) {
  const navigate = useNavigate()

  const formattedDate = formatDateCompact(workout.date)

  return (
    <div className={`workout-card ${isNext ? 'highlight' : ''}`}>
      <div className="workout-head">
        <span>{formattedDate}</span>
        <WorkoutButton
          label="Details"
          icon="📄"
          variant="info"
          onClick={() => navigate(`/workout/${workout.id}`)}
        />
      </div>

      {isToday && <span className="accent">← Today</span>}
      {isNext && <span className="info">Next Up</span>}

      <div className="lifts">
        {workout.workout_exercises
          .sort((a, b) => a.order - b.order)
          .map((we, i) => (
            <div className="lift" key={i}>
              <span className="lift-name">{we.exercise?.name ?? 'Unknown'}</span>
              <br />
              <span>
                {we.sets} sets | {we.reps} Reps | {we.weight ?? 0} lbs
              </span>
            </div>
          ))}
      </div>

      <div className="workout-btns">
        <button
          className="start-btn btn"
          onClick={() => navigate(`/runner/${workout.id}`)}
        >
          Start
        </button>
        <WorkoutButton
          label="Delete"
          icon="🗑"
          variant="accent"
          onClick={() => onDelete(workout.id)}
        />
      </div>
    </div>
  )
}

function formatDateCompact(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
  }).format(date)

  const compactDate = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  }).format(date)

  return `${weekday} ${compactDate}`
}
