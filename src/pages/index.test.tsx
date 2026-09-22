import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Dashboard from './index';
import { fetchWorkoutOverview } from '../services/workoutService';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { drag, dragConstraints, dragElastic, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
}));

jest.mock('../components/WorkoutButton', () => ({
  WorkoutButton: ({ label, onClick }: any) => (
    <button onClick={onClick} type="button">{label}</button>
  ),
}));

jest.mock('../components/WorkoutCard', () => ({
  WorkoutCard: ({ workout }: any) => (
    <article data-testid="workout-card">{workout.name ?? workout.date}</article>
  ),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ userId: 'user-1', loading: false }),
}));

jest.mock('../context/SystemAlertContext', () => ({
  useSystemAlerts: () => ({ showAlert: jest.fn() }),
}));

jest.mock('../services/workoutService', () => ({
  fetchAllCompletedWorkouts: jest.fn(),
  fetchWorkoutOverview: jest.fn(),
  getLocalDateString: () => '2026-09-20',
}));

jest.mock('../utils/workoutActions', () => ({
  confirmAndDeleteWorkout: jest.fn(),
}));

describe('Dashboard future workouts', () => {
  const renderDashboard = () => render(<Dashboard />);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides the future section while retaining the hero empty card', async () => {
    (fetchWorkoutOverview as jest.Mock).mockResolvedValue({
      data: { scheduled: [], completed: [], completedCount: 0 },
      error: null,
    });

    const { container } = renderDashboard();

    expect(await screen.findByRole('button', {
      name: 'Get started / plan your next workout',
    })).toHaveClass('empty-workout-card--hero');
    await waitFor(() => expect(screen.queryByText('Loading workouts...')).not.toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Future Workouts' })).not.toBeInTheDocument();
    expect(container.querySelector('.future-workouts')).toBeNull();
  });

  it('shows the future section when a scheduled workout exists', async () => {
    (fetchWorkoutOverview as jest.Mock).mockResolvedValue({
      data: {
        scheduled: [{ id: 'workout-1', name: 'Tomorrow', date: '2026-09-21', status: 'scheduled' }],
        completed: [],
        completedCount: 0,
      },
      error: null,
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Future Workouts' })).toBeInTheDocument();
    expect(screen.getAllByTestId('workout-card')).toHaveLength(2);
  });

  it('opens the next workout in the full-page details view', async () => {
    (fetchWorkoutOverview as jest.Mock).mockResolvedValue({
      data: {
        scheduled: [{ id: 'workout-1', name: 'Tomorrow', date: '2026-09-21', status: 'scheduled' }],
        completed: [],
        completedCount: 0,
      },
      error: null,
    });

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Next Workout' }));

    expect(mockNavigate).toHaveBeenCalledWith('/workout/workout-1');
  });
});
