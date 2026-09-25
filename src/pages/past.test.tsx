import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('renders centered link rows for future and past exports', async () => {
    const { container } = render(<PastWorkouts />);

    expect(screen.getByRole('button', { name: 'Export All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Planned Workouts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export All Past Workouts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export This Week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export 2 weeks' })).toBeInTheDocument();
    expect(container.querySelectorAll('.workout-export-links > span')).toHaveLength(3);

    await waitFor(() => expect(fetchWorkoutOverview).toHaveBeenCalledWith({
      userId: 'user-1',
      includeTemplate: true,
    }));
  });

  it('keeps the button label and replaces export progress with a success alert', async () => {
    let finishExport!: (value: any) => void;
    jest.mocked(fetchWorkoutExportData).mockReturnValue(
      new Promise(resolve => {
        finishExport = resolve;
      })
    );
    render(<PastWorkouts />);

    const plannedButton = screen.getByRole('button', { name: 'Export Planned Workouts' });
    fireEvent.click(plannedButton);

    expect(plannedButton).toHaveTextContent('Export Planned Workouts');
    expect(screen.queryByRole('button', { name: 'Exporting...' })).not.toBeInTheDocument();
    expect(mockShowAlert).toHaveBeenCalledWith('Exporting planned workouts...', {
      replaceKey: 'workout-export',
      duration: 300000,
    });

    finishExport({
      data: [{
        id: 'planned-1',
        date: '2099-01-01',
        status: 'scheduled',
        workout_exercises: [],
      }],
      error: null,
    });

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalled());
    expect(mockShowAlert).toHaveBeenLastCalledWith('Exported planned workouts.', {
      tone: 'success',
      replaceKey: 'workout-export',
    });
  });
});
