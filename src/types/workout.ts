// src/types/workout.ts

export type ExerciseType = 'strength' | 'cardio';
export type DistanceUnit = 'mi' | 'km' | 'm' | 'yd';

export interface CardioMetrics {
  duration_seconds?: number | null;
  distance_value?: number | null;
  distance_unit?: DistanceUnit | null;
  calories?: number | null;
  average_heart_rate?: number | null;
  resistance?: number | null;
  incline?: number | null;
}

export interface WorkoutSet extends CardioMetrics {
  id?: string;
	workout_exercise_id?: string;
  set_number: number;
  reps?: number | null;
  weight?: number | null;
  intensity_type?: string;
  notes?: string;
}

export interface WorkoutExercise {
  id: string;                 // workout_exercises.id
  exercise_id: string;        // 🔑 CANONICAL FK (required)
  order: number;

  // Optional joined data
  exercise: {
    id: string;
    name: string;
    target_muscle: string;
    exercise_type: ExerciseType;
  } | null;

  workout_sets: WorkoutSet[];
}


export interface Workout {
  id: string;
  date: string;
  status?: string;
  workout_exercises: WorkoutExercise[];
}
