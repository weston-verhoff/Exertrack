import {
  fetchWorkoutBuilderExercises,
  getWorkoutBuilderUpdatePlan,
  PersistedBuilderExercise,
} from './workoutService';
import { BuilderExerciseConfig } from '../types/workoutBuilder';
import { supabase } from '../supabase/client';

jest.mock('../supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

const existingExercise = (
  id: string,
  exerciseId: string,
  order: number,
  reps: number,
  completed: boolean
): PersistedBuilderExercise => ({
  id,
  exercise_id: exerciseId,
  order,
  workout_sets: [
    {
      set_number: 1,
      reps,
      weight: 100,
      intensity_type: 'normal',
      completed,
    },
  ],
});

const editedExercise = (
  workoutExerciseId: string,
  exerciseId: string,
  order: number,
  reps: number
): BuilderExerciseConfig => ({
  id: `builder-${workoutExerciseId}`,
  workout_exercise_id: workoutExerciseId,
  exercise_id: exerciseId,
  name: exerciseId,
  exercise_type: 'strength',
  order,
  sets: [
    {
      set_number: 1,
      reps,
      weight: 100,
      intensity_type: 'normal',
    },
  ],
});

describe('getWorkoutBuilderUpdatePlan', () => {
  it('preserves every exercise when only the workout date or exercise order changes', () => {
    const bench = existingExercise('workout-exercise-1', 'bench', 0, 8, true);
    const row = existingExercise('workout-exercise-2', 'row', 1, 10, true);

    const plan = getWorkoutBuilderUpdatePlan(
      [bench, row],
      [
        editedExercise(row.id, row.exercise_id, 0, 10),
        editedExercise(bench.id, bench.exercise_id, 1, 8),
      ]
    );

    expect(plan.deleteIds).toEqual([]);
    expect(plan.exercisesToInsert).toEqual([]);
    expect(plan.exercisesToUpdate.map(item => item.id)).toEqual([
      'workout-exercise-2',
      'workout-exercise-1',
    ]);
  });

  it('replaces only the exercise whose set programming changed', () => {
    const bench = existingExercise('workout-exercise-1', 'bench', 0, 8, true);
    const row = existingExercise('workout-exercise-2', 'row', 1, 10, true);
    const adjustedBench = editedExercise(bench.id, bench.exercise_id, 0, 12);
    const untouchedRow = editedExercise(row.id, row.exercise_id, 1, 10);

    const plan = getWorkoutBuilderUpdatePlan(
      [bench, row],
      [adjustedBench, untouchedRow]
    );

    expect(plan.deleteIds).toEqual(['workout-exercise-1']);
    expect(plan.exercisesToInsert).toEqual([adjustedBench]);
    expect(plan.exercisesToUpdate).toEqual([
      { id: 'workout-exercise-2', exercise: untouchedRow },
    ]);
  });
});

describe('fetchWorkoutBuilderExercises', () => {
  it('retains the persisted workout exercise id needed to preserve completion', async () => {
    const workoutExercisesQuery: any = {};
    workoutExercisesQuery.select = jest.fn(() => workoutExercisesQuery);
    workoutExercisesQuery.eq = jest.fn(() => workoutExercisesQuery);
    workoutExercisesQuery.order = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'workout-exercise-1',
          exercise_id: 'bench',
          order: 0,
          exercise: {
            id: 'bench',
            name: 'Bench Press',
            target_muscle: 'Chest',
            exercise_type: 'strength',
            track_laps: false,
          },
          workout_sets: [
            {
              set_number: 1,
              reps: 8,
              weight: 100,
              intensity_type: 'normal',
              completed: true,
            },
          ],
        },
      ],
      error: null,
    });

    const workoutQuery: any = {};
    workoutQuery.select = jest.fn(() => workoutQuery);
    workoutQuery.eq = jest.fn(() => workoutQuery);
    workoutQuery.single = jest.fn().mockResolvedValue({
      data: { date: '2026-09-25' },
      error: null,
    });

    jest.mocked(supabase.from).mockImplementation((table: string) =>
      table === 'workout_exercises' ? workoutExercisesQuery : workoutQuery
    );

    const result = await fetchWorkoutBuilderExercises('workout-1');

    expect(result.error).toBeNull();
    expect(result.data?.exercises[0]).toEqual(
      expect.objectContaining({
        workout_exercise_id: 'workout-exercise-1',
        exercise_id: 'bench',
      })
    );
    expect(workoutExercisesQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('id,')
    );
  });
});
