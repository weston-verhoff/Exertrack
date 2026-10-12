import { parseWorkoutText } from './workoutImport';
import { formatWorkoutsAsText } from './workoutExport';

test('round trips exported strength and cardio metrics into scheduled drafts', () => {
  const text = formatWorkoutsAsText([{
    id: 'w', date: '2026-10-12', status: 'completed', workout_exercises: [
      { id: 's', exercise_id: 's', order: 0, exercise: { id: 's', name: 'Bench Press', target_muscle: 'Chest', exercise_type: 'strength' }, workout_sets: [{ set_number: 1, weight: 125.5, reps: 8, completed: true }] },
      { id: 'c', exercise_id: 'c', order: 1, exercise: { id: 'c', name: 'Running', target_muscle: '', exercise_type: 'cardio' }, workout_sets: [{ set_number: 1, duration_seconds: 3601, distance_value: 5, distance_unit: 'km', calories: 250, completed: true }] },
    ],
  }]);
  const parsed = parseWorkoutText('\uFEFF' + text.replace(/\n/g, '\r\n'));
  expect(parsed[0].date).toBe('2026-10-12');
  expect(parsed[0].exercises[0].sets[0]).toEqual({ set_number: 1, weight: 125.5, reps: 8 });
  expect(parsed[0].exercises[1].sets[0]).toEqual({ set_number: 1, duration_seconds: 3601, distance_value: 5, distance_unit: 'km', calories: 250 });
});

test.each([
  '', 'Monday (2/30/26)\nBench\nSet 1: 10lbs for 8 reps',
  'Monday (10/12/26)\nBench',
  'Monday (10/12/26)\nBench\nSet 1: -10lbs for 8 reps',
  'Monday (10/12/26)\nBench\nSet 1: 10lbs for 8 reps\nSet 1: 10lbs for 8 reps',
  'Monday (10/12/26)\nRun\nSegment 1: 1:99 | Not completed',
  '\x00Monday (10/12/26)',
])('rejects malformed input without returning partial drafts: %s', text => {
  expect(() => parseWorkoutText(text)).toThrow();
});
