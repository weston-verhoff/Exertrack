import { CardioMetrics, ExerciseType } from './workout';

export interface BuilderWorkoutSet extends CardioMetrics {
  set_number: number;
  reps?: number | null;
  weight?: number | null;
  intensity_type?: string;
  notes?: string;
}

export interface BuilderExerciseConfig {
  id: string;
  exercise_id: string;
  name: string;
  target_muscle?: string;
  exercise_type: ExerciseType;
  sets: BuilderWorkoutSet[];
  order: number;
}
