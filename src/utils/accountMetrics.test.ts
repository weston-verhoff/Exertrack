import {
  getStrengthVolume,
  getWeekStartDateKey,
  getWeeklySummary,
} from './accountMetrics';

const strengthExercise = {
  sets: 2,
  reps: 10,
  weight: 100,
  exercise: {
    name: 'Bench Press',
    target_muscle: 'Chest',
    exercise_type: 'strength' as const,
  },
  workout_sets: [
    { set_number: 1, reps: 10, weight: 100 },
    { set_number: 2, reps: 8, weight: 110 },
  ],
};

test('finds the configured beginning of the week', () => {
  const friday = new Date(2026, 8, 18, 12);
  expect(getWeekStartDateKey(1, friday)).toBe('2026-09-14');
  expect(getWeekStartDateKey(0, friday)).toBe('2026-09-13');
});

test('calculates volume from actual set values', () => {
  expect(getStrengthVolume(strengthExercise)).toBe(1880);
});

test('summarizes strength sets and cardio minutes for the current week', () => {
  const workouts = [
    {
      id: 'current',
      date: '2026-09-18',
      workout_exercises: [
        strengthExercise,
        {
          sets: 1,
          reps: null,
          weight: null,
          exercise: {
            name: 'Run',
            target_muscle: 'Cardio',
            exercise_type: 'cardio' as const,
          },
          workout_sets: [{ set_number: 1, duration_seconds: 1500 }],
        },
      ],
    },
    {
      id: 'previous',
      date: '2026-09-12',
      workout_exercises: [strengthExercise],
    },
  ];

  const summary = getWeeklySummary(workouts, '2026-09-14');
  expect(summary.workouts).toHaveLength(1);
  expect(summary.strengthSets).toBe(2);
  expect(summary.cardioMinutes).toBe(25);
});
