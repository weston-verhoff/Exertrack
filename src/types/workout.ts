// src/types/workout.ts

export interface WorkoutSet {
  id?: string;
  set_number: number;
  reps: number;
  weight: number;
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
  } | null;

  workout_sets: WorkoutSet[];
}


export interface Workout {
  id: string;
  date: string;
  status?: string;
  workout_exercises: WorkoutExercise[];
}
