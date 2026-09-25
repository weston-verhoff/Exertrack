import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WorkoutCalendar, getCalendarDays } from './WorkoutCalendar';
import { fetchWorkoutsInDateRange } from '../services/workoutService';
import { WorkoutWithTemplate } from '../services/workoutService';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'user-1' }),
}));

jest.mock('../services/workoutService', () => ({
  fetchWorkoutsInDateRange: jest.fn(),
}));

jest.mock('./WorkoutDetailsDrawer', () => ({
  WorkoutDetailsDrawer: ({ workout, onClose }: any) => (
    <div>
      <p>Drawer for {workout.id}</p>
      <button type="button" onClick={onClose}>Close drawer</button>
    </div>
  ),
}));

const workout: WorkoutWithTemplate = {
  id: 'workout-1',
  date: '2026-09-25',
  status: 'scheduled',
  template: { name: 'Leg day' },
  workout_exercises: [],
};

describe('WorkoutCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchWorkoutsInDateRange).mockResolvedValue({
      data: [workout],
      error: null,
    });
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 25));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds complete Sunday-to-Saturday calendar weeks', () => {
    const days = getCalendarDays(new Date(2026, 8, 1));
    expect(days).toHaveLength(35);
    expect(days[0].getDay()).toBe(0);
    expect(days[days.length - 1].getDay()).toBe(6);
  });

  it('loads the visible month and opens the workout drawer from View', async () => {
    render(
      <WorkoutCalendar
        initialWorkouts={[workout]}
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onWorkoutUpdated={jest.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View Leg day on 2026-09-25' }));
    expect(screen.getByText('Drawer for workout-1')).toBeInTheDocument();

    await waitFor(() => expect(fetchWorkoutsInDateRange).toHaveBeenCalledWith({
      userId: 'user-1',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    }));
  });

  it('moves to the next month', async () => {
    render(
      <WorkoutCalendar
        initialWorkouts={[]}
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onWorkoutUpdated={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    await waitFor(() => expect(fetchWorkoutsInDateRange).toHaveBeenLastCalledWith({
      userId: 'user-1',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    }));
  });

  it('shows no more than three exercise names in a workout block', async () => {
    const workoutWithExercises: WorkoutWithTemplate = {
      ...workout,
      workout_exercises: ['Squat', 'Deadlift', 'Leg Curl', 'Calf Raise'].map((name, index) => ({
        id: `workout-exercise-${index}`,
        exercise_id: `exercise-${index}`,
        order: index,
        exercise: {
          id: `exercise-${index}`,
          name,
          target_muscle: 'Legs',
          exercise_type: 'strength' as const,
        },
        workout_sets: [],
      })),
    };
    jest.mocked(fetchWorkoutsInDateRange).mockResolvedValue({
      data: [workoutWithExercises],
      error: null,
    });

    render(
      <WorkoutCalendar
        initialWorkouts={[workoutWithExercises]}
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onWorkoutUpdated={jest.fn()}
      />
    );

    expect(screen.getAllByText('Squat').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Deadlift').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Leg Curl').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Calf Raise')).toHaveLength(0);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('selects a day and opens its workout from the mobile agenda', async () => {
    const { container } = render(
      <WorkoutCalendar
        initialWorkouts={[workout]}
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onWorkoutUpdated={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show workouts for 2026-09-24' }));
    expect(screen.getByRole('heading', { name: 'Thursday, September 24' })).toBeInTheDocument();
    expect(screen.getByText('No workouts scheduled.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show workouts for 2026-09-25' }));
    const agenda = container.querySelector('.workout-calendar__agenda');
    expect(agenda).not.toBeNull();
    fireEvent.click(within(agenda as HTMLElement).getByRole('button', { name: 'View' }));
    expect(screen.getByText('Drawer for workout-1')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});
