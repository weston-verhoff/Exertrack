import { render, screen } from '@testing-library/react';
import { WorkoutDetails } from './WorkoutDetails';
import { WorkoutExercise } from '../types/workout';

jest.mock(
  'react-router-dom',
  () => ({ useNavigate: () => jest.fn() }),
  { virtual: true }
);

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { user_metadata: { distance_system: 'metric', weight_system: 'metric' } },
    userId: 'user-1',
    loading: false,
  }),
}));

jest.mock('../services/workoutService', () => ({
  deleteWorkoutSet: jest.fn(),
  duplicateWorkoutFromExercises: jest.fn(),
  insertWorkoutSet: jest.fn(),
  updateWorkoutStatus: jest.fn(),
}));

jest.mock('./WorkoutButton', () => ({
  WorkoutButton: ({ label, onClick, disabled }: any) => (
    <button type="button" onClick={onClick} disabled={disabled}>{label}</button>
  ),
}));

const cardioExercise = (trackLaps: boolean): WorkoutExercise => ({
  id: 'workout-exercise-1',
  exercise_id: 'exercise-1',
  order: 0,
  exercise: {
    id: 'exercise-1',
    name: 'Running',
    target_muscle: 'Full Body',
    exercise_type: 'cardio',
    default_distance_unit: 'km',
    track_laps: trackLaps,
  },
  workout_sets: [
    {
      id: 'set-1',
      set_number: 1,
      duration_seconds: 1800,
      distance_value: 4.1,
      distance_unit: 'km',
    },
  ],
});

const strengthExercise: WorkoutExercise = {
  id: 'workout-exercise-2',
  exercise_id: 'exercise-2',
  order: 1,
  exercise: {
    id: 'exercise-2',
    name: 'Bench Press',
    target_muscle: 'Chest',
    exercise_type: 'strength',
  },
  workout_sets: [
    {
      id: 'set-2',
      set_number: 1,
      reps: 10,
      weight: 20,
    },
  ],
};

const renderDetails = (
  exercise: WorkoutExercise | WorkoutExercise[],
  fullPage = false
) =>
  render(
    <WorkoutDetails
      fullPage={fullPage}
      workoutId="workout-1"
      date="2026-09-19"
      status="scheduled"
      exercises={Array.isArray(exercise) ? exercise : [exercise]}
      onDateChange={jest.fn()}
      onSave={jest.fn().mockResolvedValue(undefined)}
      onStatusChange={jest.fn()}
      onExercisesChange={jest.fn()}
      onDelete={jest.fn()}
    />
  );

describe('WorkoutDetails layout', () => {
  it('scopes the wide two-column layout to the full-page view', () => {
    const drawerView = renderDetails(strengthExercise);
    expect(drawerView.container.firstChild).not.toHaveClass(
      'workout-details--full-page'
    );
    drawerView.unmount();

    const fullPageView = renderDetails(strengthExercise, true);
    expect(fullPageView.container.firstChild).toHaveClass(
      'workout-details--full-page'
    );
  });
});

describe('WorkoutDetails cardio controls', () => {
  it('uses the configured unit without segment controls when laps are disabled', () => {
    renderDetails(cardioExercise(false));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Segment' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Segment 1:/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Distance unit')).toHaveTextContent('km');
  });

  it('shows segment controls when laps are enabled', () => {
    renderDetails(cardioExercise(true));

    expect(screen.getByRole('button', { name: 'Add Segment' })).toBeInTheDocument();
    expect(screen.getByText(/Segment 1:/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

describe('WorkoutDetails volume summaries', () => {
  it('shows only cardio volume for a cardio-only workout', () => {
    const running = cardioExercise(false);
    running.workout_sets[0].duration_seconds = 1200;
    running.exercise!.target_muscle = 'Legs';
    const biking: WorkoutExercise = {
      ...cardioExercise(false),
      id: 'workout-exercise-3',
      exercise_id: 'exercise-3',
      exercise: {
        ...cardioExercise(false).exercise!,
        id: 'exercise-3',
        name: 'Biking',
        target_muscle: 'Legs',
      },
      workout_sets: [
        {
          id: 'set-3',
          set_number: 1,
          duration_seconds: 3600,
          distance_value: 12,
          distance_unit: 'km',
        },
      ],
    };

    renderDetails([running, biking]);

    expect(screen.queryByRole('heading', { name: 'Muscle Volume Breakdown' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Volume Summary' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cardio Volume' })).toBeInTheDocument();
    expect(screen.getByText('Running: Legs → Volume: 20 minutes')).toBeInTheDocument();
    expect(screen.getByText('Biking: Legs → Volume: 60 minutes')).toBeInTheDocument();
  });

  it('shows strength and cardio summaries for a mixed workout', () => {
    renderDetails([strengthExercise, cardioExercise(false)]);

    expect(screen.getByRole('heading', { name: 'Muscle Volume Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Volume Summary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cardio Volume' })).toBeInTheDocument();
    expect(screen.getByText('Chest: 200')).toBeInTheDocument();
    expect(screen.getByText('Bench Press: 1 sets → Volume: 200')).toBeInTheDocument();
    expect(screen.getByText('Running: Full Body → Volume: 30 minutes')).toBeInTheDocument();
  });

  it('shows only strength summaries for a strength-only workout', () => {
    renderDetails(strengthExercise);

    expect(screen.getByRole('heading', { name: 'Muscle Volume Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Volume Summary' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cardio Volume' })).not.toBeInTheDocument();
  });
});
