import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkoutDetails } from './WorkoutDetails';
import { WorkoutExercise } from '../types/workout';
import {
  updateWorkoutSetCompletion,
  updateWorkoutStatus,
} from '../services/workoutService';

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
  updateWorkoutSetCompletion: jest.fn(),
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
      onSave={jest.fn().mockResolvedValue(true)}
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

  it('keeps exercises and volume summaries in mobile reading order', () => {
    renderDetails(strengthExercise, true);

    const exercises = screen.getByRole('heading', { name: 'Exercises' });
    const muscleVolume = screen.getByRole('heading', { name: 'Muscle Volume Breakdown' });
    const volumeSummary = screen.getByRole('heading', { name: 'Volume Summary' });

    expect(exercises.compareDocumentPosition(muscleVolume)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(muscleVolume.compareDocumentPosition(volumeSummary)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('uses spinner-free text fields with a decimal keyboard hint', () => {
    const { container } = renderDetails(strengthExercise);
    const inputs = container.querySelectorAll('.workout-details__numeric-input');

    expect(inputs).toHaveLength(2);
    inputs.forEach(input => {
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('inputmode', 'decimal');
    });
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('places uppercase metric labels below their fields', () => {
    const { container } = renderDetails(strengthExercise);
    const fields = container.querySelectorAll('.metric-field');

    expect(fields).toHaveLength(2);
    expect(fields[0]).toHaveTextContent('REPS');
    expect(fields[1]).toHaveTextContent('KG');
    fields.forEach(field => {
      expect(field.firstElementChild).toHaveClass('metric-field__control');
      expect(field.lastElementChild).toHaveClass('metric-field__label');
    });
  });

  it('does not offer the retired workout runner action', () => {
    renderDetails(strengthExercise, true);

    expect(screen.queryByRole('button', { name: 'Start Workout' })).not.toBeInTheDocument();
  });
});

describe('WorkoutDetails completion', () => {
  beforeEach(() => {
    jest.mocked(updateWorkoutStatus).mockResolvedValue({ data: null, error: null });
  });

  it('saves changes before marking the workout completed', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    const onStatusChange = jest.fn();
    render(
      <WorkoutDetails
        fullPage
        workoutId="workout-1"
        date="2026-09-19"
        status="scheduled"
        exercises={[strengthExercise]}
        onDateChange={jest.fn()}
        onSave={onSave}
        onStatusChange={onStatusChange}
        onExercisesChange={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark Completed' }));

    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith('completed'));
    expect(onSave).toHaveBeenCalledWith({ announceSuccess: false });
    expect(updateWorkoutStatus).toHaveBeenCalledWith({
      workoutId: 'workout-1',
      userId: 'user-1',
      status: 'completed',
    });
    expect(onSave.mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(updateWorkoutStatus).mock.invocationCallOrder[0]
    );
  });

  it('does not complete the workout when saving fails', async () => {
    const onSave = jest.fn().mockResolvedValue(false);
    render(
      <WorkoutDetails
        fullPage
        workoutId="workout-1"
        date="2026-09-19"
        status="scheduled"
        exercises={[strengthExercise]}
        onDateChange={jest.fn()}
        onSave={onSave}
        onStatusChange={jest.fn()}
        onExercisesChange={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark Completed' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(updateWorkoutStatus).not.toHaveBeenCalled();
  });

  it('does not report completion when the status update fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(updateWorkoutStatus).mockResolvedValueOnce({
      data: null,
      error: 'status update failed',
    });
    const onStatusChange = jest.fn();
    render(
      <WorkoutDetails
        fullPage
        workoutId="workout-1"
        date="2026-09-19"
        status="scheduled"
        exercises={[strengthExercise]}
        onDateChange={jest.fn()}
        onSave={jest.fn().mockResolvedValue(true)}
        onStatusChange={onStatusChange}
        onExercisesChange={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark Completed' }));

    await waitFor(() => expect(updateWorkoutStatus).toHaveBeenCalled());
    expect(onStatusChange).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('WorkoutDetails cardio controls', () => {
  it('uses the configured unit without segment controls when laps are disabled', () => {
    renderDetails(cardioExercise(false));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Segment' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Segment 1:/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Distance unit')).toHaveTextContent('DIST (KM)');
  });

  it('shows segment controls when laps are enabled', () => {
    renderDetails(cardioExercise(true));

    expect(screen.getByRole('button', { name: 'Add Segment' })).toBeInTheDocument();
    expect(screen.getByText(/Segment 1:/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

describe('WorkoutDetails set completion', () => {
  beforeEach(() => {
    jest.mocked(updateWorkoutSetCompletion).mockResolvedValue({ data: null, error: null });
  });

  it('persists and reports a completed strength set', async () => {
    const onExercisesChange = jest.fn();
    const onPersistedExercisesChange = jest.fn();
    render(
      <WorkoutDetails
        workoutId="workout-1"
        date="2026-09-19"
        status="scheduled"
        exercises={[strengthExercise]}
        onDateChange={jest.fn()}
        onSave={jest.fn().mockResolvedValue(true)}
        onStatusChange={jest.fn()}
        onExercisesChange={onExercisesChange}
        onPersistedExercisesChange={onPersistedExercisesChange}
        onDelete={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark completed set 1' }));

    await waitFor(() => expect(updateWorkoutSetCompletion).toHaveBeenCalledWith({
      setId: 'set-2',
      completed: true,
    }));
    expect(onExercisesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        workout_sets: [expect.objectContaining({ id: 'set-2', completed: true })],
      }),
    ]);
    expect(onPersistedExercisesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        workout_sets: [expect.objectContaining({ id: 'set-2', completed: true })],
      }),
    ]);
  });

  it('allows cardio segments to be marked incomplete', async () => {
    const onExercisesChange = jest.fn();
    const cardio = cardioExercise(true);
    cardio.workout_sets[0].completed = true;
    render(
      <WorkoutDetails
        workoutId="workout-1"
        date="2026-09-19"
        status="scheduled"
        exercises={[cardio]}
        onDateChange={jest.fn()}
        onSave={jest.fn().mockResolvedValue(true)}
        onStatusChange={jest.fn()}
        onExercisesChange={onExercisesChange}
        onDelete={jest.fn()}
      />
    );

    const completionButton = screen.getByRole('button', { name: 'Mark incomplete segment 1' });
    expect(completionButton).toHaveTextContent('✓');
    fireEvent.click(completionButton);

    await waitFor(() => expect(updateWorkoutSetCompletion).toHaveBeenCalledWith({
      setId: 'set-1',
      completed: false,
    }));
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
