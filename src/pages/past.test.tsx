import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PastWorkouts from './past';
import { fetchWorkoutOverview, fetchWorkoutsInDateRange } from '../services/workoutService';
import { fetchWorkoutExportData } from '../services/workoutExportService';
import { downloadTextFile } from '../utils/workoutExport';

const mockShowAlert = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock('../components/Layout', () => ({
  Layout: ({ children }: any) => <main>{children}</main>,
}));

jest.mock('../components/WorkoutButton', () => ({
  WorkoutButton: ({ label, loading, loadingLabel, onClick, disabled }: any) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {loading ? loadingLabel : label}
    </button>
  ),
}));

jest.mock('../components/WorkoutCard', () => ({
  WorkoutCard: () => <article>Workout</article>,
}));

jest.mock('../components/LoadingSkeletons', () => ({
  WorkoutCardSkeletonGrid: () => <div>Loading workouts</div>,
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    userId: 'user-1',
    user: { id: 'user-1', user_metadata: { start_of_week: 1 } },
    loading: false,
  }),
}));

jest.mock('../context/SystemAlertContext', () => ({
  useSystemAlerts: () => ({ showAlert: mockShowAlert }),
}));

jest.mock('../services/workoutService', () => ({
  fetchAllCompletedWorkouts: jest.fn(),
  deleteWorkouts: jest.fn(),
  fetchWorkoutOverview: jest.fn(),
  fetchWorkoutsInDateRange: jest.fn(),
}));

jest.mock('../services/workoutExportService', () => ({
  fetchWorkoutExportData: jest.fn(),
}));

jest.mock('../utils/workoutExport', () => ({
  ...jest.requireActual('../utils/workoutExport'),
  downloadTextFile: jest.fn(),
}));

jest.mock('../utils/workoutActions', () => ({
  confirmAndDeleteWorkout: jest.fn(),
}));

describe('PastWorkouts export actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchWorkoutOverview).mockResolvedValue({
      data: { scheduled: [], completed: [], completedCount: 0 },
      error: null,
    });
    jest.mocked(fetchWorkoutsInDateRange).mockResolvedValue({ data: [], error: null });
  });

  it('opens one export drawer with every supported range', async () => {
    render(<PastWorkouts />);

    expect(screen.getByRole('button', { name: 'Plan a Workout' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    const drawer = screen.getByText('Export workouts').closest('aside');
    expect(drawer).not.toBeNull();
    const drawerQueries = within(drawer!);
    ['This week', 'Last 2 weeks', 'All workouts', 'Future workouts', 'Past workouts', 'Custom date range']
      .forEach(label => expect(drawerQueries.getByRole('radio', { name: label })).toBeInTheDocument());

    await waitFor(() => expect(fetchWorkoutOverview).toHaveBeenCalledWith({
      userId: 'user-1',
      includeTemplate: true,
    }));
  });

  it('shows drawer progress and replaces export progress with a success alert', async () => {
    let finishExport!: (value: any) => void;
    jest.mocked(fetchWorkoutExportData).mockReturnValue(
      new Promise(resolve => {
        finishExport = resolve;
      })
    );
    render(<PastWorkouts />);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    const drawer = screen.getByText('Export workouts').closest('aside')!;
    const drawerQueries = within(drawer);
    fireEvent.click(drawerQueries.getByRole('radio', { name: 'Future workouts' }));
    fireEvent.click(drawerQueries.getByRole('button', { name: 'Export' }));

    expect(drawerQueries.getByRole('button', { name: 'Exporting...' })).toBeDisabled();
    expect(mockShowAlert).toHaveBeenCalledWith('Exporting planned workouts...', {
      replaceKey: 'workout-export',
      duration: 300000,
    });

    await act(async () => {
      finishExport({
        data: [{
          id: 'planned-1',
          date: '2099-01-01',
          status: 'scheduled',
          workout_exercises: [],
        }],
        error: null,
      });
    });

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalled());
    expect(mockShowAlert).toHaveBeenLastCalledWith('Exported planned workouts.', {
      tone: 'success',
      replaceKey: 'workout-export',
    });
  });
});
