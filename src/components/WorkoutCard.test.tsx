import { fireEvent, render, screen } from '@testing-library/react';
import { WorkoutCard } from './WorkoutCard';
import { Workout } from '../types/workout';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), {
  virtual: true,
});

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'user-1' }),
}));

jest.mock('./Drawer', () => ({
  Drawer: ({ children, isOpen }: any) => (
    <div data-testid="drawer" data-open={String(isOpen)}>{isOpen ? children : null}</div>
  ),
}));

jest.mock('./WorkoutButton', () => ({
  WorkoutButton: ({ label, onClick, iconOnly, variant, intent }: any) => (
    <button type="button" onClick={onClick} aria-label={iconOnly ? label : undefined} data-variant={variant} data-intent={intent}>
      {iconOnly ? null : label}
    </button>
  ),
}));

jest.mock('./WorkoutDetails', () => ({
  WorkoutDetails: ({ exercises, onClose, onPersistedExercisesChange }: any) => (
    <>
      <button
        type="button"
        onClick={() => onPersistedExercisesChange([
          {
            ...exercises[0],
            workout_sets: [{ ...exercises[0].workout_sets[0], completed: true }],
          },
        ])}
      >
        Persist completion
      </button>
      <button type="button" onClick={onClose}>Close details</button>
    </>
  ),
}));

const workout: Workout = {
  id: 'workout-1',
  date: '2026-09-21',
  status: 'scheduled',
  workout_exercises: [
    {
      id: 'workout-exercise-1',
      exercise_id: 'exercise-1',
      order: 0,
      exercise: {
        id: 'exercise-1',
        name: 'Bench Press',
        target_muscle: 'Chest',
        exercise_type: 'strength',
      },
      workout_sets: [{ id: 'set-1', set_number: 1, reps: 8, weight: 20 }],
    },
  ],
};

describe('WorkoutCard persisted set changes', () => {
  it('promotes a persisted completion change to the parent workout', async () => {
    const onWorkoutUpdated = jest.fn();
    render(
      <WorkoutCard
        workout={{ ...workout, status: 'completed' }}
        variant="past-workout"
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onWorkoutUpdated={onWorkoutUpdated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Persist completion' }));

    expect(onWorkoutUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        workout_exercises: [
          expect.objectContaining({
            workout_sets: [expect.objectContaining({ id: 'set-1', completed: true })],
          }),
        ],
      })
    );
  });
});

describe('WorkoutCard actions', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('opens scheduled future workouts in the details drawer', async () => {
    render(
      <WorkoutCard
        workout={workout}
        variant="future-workout"
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onWorkoutUpdated={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Persist completion' })).toBeInTheDocument();
  });

  it('keeps the lazy drawer mounted while its close animation runs', async () => {
    render(
      <WorkoutCard
        workout={workout}
        variant="future-workout"
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onWorkoutUpdated={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Close details' }));

    expect(screen.getByTestId('drawer')).toHaveAttribute('data-open', 'false');
  });

  it('uses the full-page details action for the highlighted next workout', () => {
    render(
      <WorkoutCard
        workout={workout}
        variant="highlighted"
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onWorkoutUpdated={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(mockNavigate).toHaveBeenCalledWith('/workout/workout-1');
    expect(screen.queryByRole('button', { name: 'Persist completion' })).not.toBeInTheDocument();
  });

  it('retains the drawer details action for completed workouts', async () => {
    render(
      <WorkoutCard
        workout={{ ...workout, status: 'completed' }}
        variant="past-workout"
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onWorkoutUpdated={jest.fn()}
      />
    );

    const detailsButton = screen.getByRole('button', { name: 'Details' });
    expect(detailsButton.closest('.workout-btns')).not.toBeNull();
    expect(detailsButton).toHaveAttribute('data-variant', 'secondary');
    fireEvent.click(detailsButton);
    expect(await screen.findByRole('button', { name: 'Persist completion' })).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toBeEmptyDOMElement();
    expect(deleteButton).toHaveAttribute('data-variant', 'secondary');
    expect(deleteButton).toHaveAttribute('data-intent', 'danger');
  });
});
