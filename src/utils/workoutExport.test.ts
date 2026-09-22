import { ExportWorkout } from '../services/workoutExportService';
import {
  buildWorkoutExportFilename,
  filterWorkoutsForExport,
  formatWorkoutsAsText,
  subtractCalendarDays,
} from './workoutExport';

const workout: ExportWorkout = {
  id: 'workout-1',
  date: '2026-09-21',
  status: 'completed',
  workout_exercises: [
    {
      id: 'workout-exercise-1',
      exercise_id: 'exercise-1',
      order: 1,
      exercise: {
        id: 'exercise-1',
        name: 'Bench Press',
        target_muscle: 'Chest',
        exercise_type: 'strength',
      },
      workout_sets: [
        { set_number: 1, weight: 135, reps: 8, completed: true },
        { set_number: 2, weight: 135, reps: 6, completed: false },
      ],
    },
    {
      id: 'workout-exercise-2',
      exercise_id: 'exercise-2',
      order: 2,
      exercise: {
        id: 'exercise-2',
        name: 'Running',
        target_muscle: 'Cardio',
        exercise_type: 'cardio',
      },
      workout_sets: [
        { set_number: 1, duration_seconds: 600, completed: true },
        { set_number: 2, duration_seconds: 300, completed: false },
      ],
    },
  ],
};

describe('formatWorkoutsAsText', () => {
  it('flags strength sets and cardio segments as completed or not completed', () => {
    const output = formatWorkoutsAsText([workout]);

    expect(output).toContain('Monday (9/21/26) (Completed)');
    expect(output).toContain('Set 1: 135lbs for 8 reps | Completed');
    expect(output).toContain('Set 2: 135lbs for 6 reps | Not completed');
    expect(output).toContain('Segment 1: 10:00 | Completed');
    expect(output).toContain('Segment 2: 5:00 | Not completed');
  });
});

describe('filterWorkoutsForExport', () => {
  const exportDate = new Date(2026, 8, 22);
  const makeWorkout = (id: string, date: string, status: string): ExportWorkout => ({
    ...workout,
    id,
    date,
    status,
  });
  const workouts = [
    makeWorkout('older', '2026-09-07', 'completed'),
    makeWorkout('two-week-start', '2026-09-08', 'scheduled'),
    makeWorkout('week-start', '2026-09-21', 'completed'),
    makeWorkout('today-completed', '2026-09-22', 'completed'),
    makeWorkout('today-scheduled', '2026-09-22', 'scheduled'),
    makeWorkout('future', '2026-09-23', 'scheduled'),
  ];

  it('treats earlier dates and completed workouts today as past', () => {
    const result = filterWorkoutsForExport({ workouts, scope: 'past', today: exportDate });

    expect(result.map(item => item.id)).toEqual([
      'older',
      'two-week-start',
      'week-start',
      'today-completed',
    ]);
  });

  it('limits this-week and two-week exports within the past-workout boundary', () => {
    const thisWeek = filterWorkoutsForExport({
      workouts,
      scope: 'this-week',
      today: exportDate,
      weekStart: '2026-09-21',
    });
    const twoWeeks = filterWorkoutsForExport({
      workouts,
      scope: '2-weeks',
      today: exportDate,
    });

    expect(thisWeek.map(item => item.id)).toEqual(['week-start', 'today-completed']);
    expect(twoWeeks.map(item => item.id)).toEqual([
      'two-week-start',
      'week-start',
      'today-completed',
    ]);
  });

  it('exports only scheduled workouts for the planned scope', () => {
    const result = filterWorkoutsForExport({ workouts, scope: 'planned', today: exportDate });

    expect(result.map(item => item.id)).toEqual([
      'two-week-start',
      'today-scheduled',
      'future',
    ]);
  });
});

describe('workout export dates and filenames', () => {
  const exportDate = new Date(2026, 8, 22);

  it('subtracts exactly 14 calendar days', () => {
    expect(subtractCalendarDays(exportDate, 14)).toBe('2026-09-08');
  });

  it('identifies each export scope in its filename', () => {
    expect(buildWorkoutExportFilename('past', exportDate)).toBe(
      'iwynfitness-workouts-all-past-2026-09-22.txt'
    );
    expect(buildWorkoutExportFilename('this-week', exportDate)).toBe(
      'iwynfitness-workouts-this-week-2026-09-22.txt'
    );
    expect(buildWorkoutExportFilename('2-weeks', exportDate)).toBe(
      'iwynfitness-workouts-2-weeks-2026-09-22.txt'
    );
  });
});
