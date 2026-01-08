export interface BuilderWorkoutSet {
  set_number: number;
  reps: number;
  weight: number;
  intensity_type?: string;
  notes?: string;
}

export interface BuilderExerciseConfig {
  id: string;
  exercise_id: string;
  name: string;
  target_muscle?: string;
  sets: BuilderWorkoutSet[];
  order: number;
}
