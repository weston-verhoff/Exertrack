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

const renderDetails = (exercise: WorkoutExercise) =>
  render(
    <WorkoutDetails
      workoutId="workout-1"
      date="2026-09-19"
      status="scheduled"
      exercises={[exercise]}
      onDateChange={jest.fn()}
      onSave={jest.fn().mockResolvedValue(undefined)}
      onStatusChange={jest.fn()}
      onExercisesChange={jest.fn()}
      onDelete={jest.fn()}
    />
  );

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
