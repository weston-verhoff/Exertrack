import { fireEvent, render, screen } from '@testing-library/react';
import { WorkoutCard } from './WorkoutCard';
import { Workout } from '../types/workout';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), {
  virtual: true,
});

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'user-1' }),
}));

jest.mock('./Drawer', () => ({
  Drawer: ({ children, isOpen }: any) => isOpen ? <div>{children}</div> : null,
}));

jest.mock('./WorkoutButton', () => ({
  WorkoutButton: ({ label, onClick }: any) => (
    <button type="button" onClick={onClick}>{label}</button>
  ),
}));

jest.mock('./WorkoutDetails', () => ({
  WorkoutDetails: ({ exercises, onPersistedExercisesChange }: any) => (
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
  it('promotes a persisted completion change to the parent workout', () => {
    const onWorkoutUpdated = jest.fn();
    render(
      <WorkoutCard
        workout={workout}
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onWorkoutUpdated={onWorkoutUpdated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Persist completion' }));

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
