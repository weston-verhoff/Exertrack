import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AccountPage from './account';
import {
  fetchCustomExercises,
  getAccountSettings,
  updateCustomExercise,
} from '../services/accountService';
import {
  fetchAnalyticsWorkouts,
  fetchWorkoutOverview,
} from '../services/workoutService';
import { SystemAlertProvider } from '../context/SystemAlertContext';
import { createTemplateTag, fetchTemplateTags } from '../services/templateTagService';

const mockSignOut = jest.fn();

jest.mock('chart.js', () => ({
  CategoryScale: {},
  Chart: { register: jest.fn() },
  Filler: {},
  Legend: {},
  LinearScale: {},
  LineElement: {},
  PointElement: {},
  Title: {},
  Tooltip: {},
}));

jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart" />,
}));

jest.mock('../components/ResponsiveSegmentedControl', () => ({
  ResponsiveSegmentedControl: () => <div data-testid="segmented-control" />,
}));

jest.mock('../components/WorkoutCard', () => ({
  WorkoutCard: () => <div data-testid="workout-card" />,
}));

jest.mock('../components/WeightTrackingSection', () => ({
  WeightTrackingSection: () => <div data-testid="weight-tracking" />,
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { user_metadata: {} },
    userId: 'user-1',
    loading: false,
    signOut: mockSignOut,
  }),
}));

jest.mock('../services/workoutService', () => ({
  fetchAnalyticsWorkouts: jest.fn(),
  fetchWorkoutOverview: jest.fn(),
}));

jest.mock('../services/accountService', () => ({
  fetchCustomExercises: jest.fn(),
  getAccountSettings: jest.fn(),
  updateAccountSettings: jest.fn(),
  updateCustomExercise: jest.fn(),
}));

jest.mock('../services/templateTagService', () => ({
  createTemplateTag: jest.fn(),
  fetchTemplateTags: jest.fn(),
  renameTemplateTag: jest.fn(),
  deleteTemplateTag: jest.fn(),
}));

jest.mock('../utils/workoutActions', () => ({
  confirmAndDeleteWorkout: jest.fn(),
}));

describe('AccountPage custom exercise editor', () => {
  const renderAccountPage = () =>
    render(
      <SystemAlertProvider>
        <AccountPage />
      </SystemAlertProvider>
    );

  beforeEach(() => {
    mockSignOut.mockReset();
    (fetchAnalyticsWorkouts as jest.Mock).mockResolvedValue({ data: [], error: null });
    (fetchWorkoutOverview as jest.Mock).mockResolvedValue({
      data: { completed: [], completedCount: 0, scheduled: [] },
      error: null,
    });
    (fetchCustomExercises as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'exercise-1',
          name: 'Cable Row',
          target_muscle: 'Back',
          exercise_type: 'strength',
          is_custom: true,
          user_id: 'user-1',
          default_distance_unit: null,
          track_laps: false,
        },
      ],
      error: null,
    });
    (fetchTemplateTags as jest.Mock).mockResolvedValue({ data: [], error: null });
    (createTemplateTag as jest.Mock).mockResolvedValue({
      data: { id: 'tag-1', name: 'Push' },
      error: null,
    });
    (getAccountSettings as jest.Mock).mockReturnValue({
      firstName: 'Alex',
      lastName: '',
      startOfWeek: 1,
      distanceSystem: 'imperial',
      weightSystem: 'imperial',
      theme: 'default',
    });
    (updateCustomExercise as jest.Mock).mockImplementation(({ exercise }) =>
      Promise.resolve({ data: { ...exercise }, error: null })
    );
  });

  it('edits a custom exercise in the shared drawer and closes after saving', async () => {
    renderAccountPage();

    const exerciseButton = await screen.findByRole('button', { name: /Cable Row/i });
    expect(exerciseButton).toHaveAttribute('data-tone', 'library');
    fireEvent.click(exerciseButton);

    const customExercisesSection = document.querySelector('#custom-exercises');
    expect(customExercisesSection?.querySelector('form')).toBeNull();

    const drawer = document.querySelector('.drawer-panel');
    expect(drawer).toHaveClass('open');
    expect(drawer).toHaveAttribute('data-tone', 'library');
    expect(
      within(drawer as HTMLElement).getByRole('heading', { name: 'Edit custom exercise' })
    ).toBeInTheDocument();

    fireEvent.change(within(drawer as HTMLElement).getByLabelText('Name'), {
      target: { value: 'Seated Cable Row' },
    });
    fireEvent.click(within(drawer as HTMLElement).getByRole('button', { name: 'Save Exercise' }));

    await waitFor(() => {
      expect(updateCustomExercise).toHaveBeenCalledWith({
        exercise: expect.objectContaining({
          id: 'exercise-1',
          name: 'Seated Cable Row',
        }),
        userId: 'user-1',
      });
      expect(drawer).toHaveClass('closed');
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Exercise updated.');
    });
  });

  it('offers only preferred-system distance units for cardio exercises', async () => {
    (fetchCustomExercises as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'exercise-2',
          name: 'Trail Run',
          target_muscle: 'Full Body',
          exercise_type: 'cardio',
          is_custom: true,
          user_id: 'user-1',
          default_distance_unit: null,
          track_laps: false,
        },
      ],
      error: null,
    });
    (getAccountSettings as jest.Mock).mockReturnValue({
      firstName: 'Alex',
      lastName: '',
      startOfWeek: 1,
      distanceSystem: 'metric',
      weightSystem: 'imperial',
      theme: 'default',
    });

    renderAccountPage();
    fireEvent.click(await screen.findByRole('button', { name: /Trail Run/i }));

    const unitSelect = screen.getByLabelText('Default distance unit');
    expect(within(unitSelect).getAllByRole('option').map(option => option.textContent)).toEqual([
      'Kilometers (km)',
      'Meters (m)',
    ]);
    expect(unitSelect).toHaveValue('km');
    const trackLapsSwitch = screen.getByRole('switch', { name: 'Track laps' });
    expect(trackLapsSwitch).not.toBeChecked();
    fireEvent.click(trackLapsSwitch);
    expect(trackLapsSwitch).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save Exercise' }));

    await waitFor(() => {
      expect(updateCustomExercise).toHaveBeenCalledWith({
        exercise: expect.objectContaining({
          id: 'exercise-2',
          track_laps: true,
        }),
        userId: 'user-1',
      });
    });
  });

  it('creates a reusable template tag from the empty template tags section', async () => {
    renderAccountPage();

    const addTagsButton = await screen.findByRole('button', { name: 'Add Tags' });
    expect(addTagsButton.closest('.account-tag-list')).toHaveClass('account-tag-list--empty');
    fireEvent.click(addTagsButton);

    const dialog = screen.getByRole('dialog', { name: 'Create a new tag' });
    fireEvent.change(within(dialog).getByLabelText('Tag name'), {
      target: { value: 'pUsH' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(createTemplateTag).toHaveBeenCalledWith({ name: 'pUsH', userId: 'user-1' });
      expect(screen.getByRole('button', { name: 'Edit Push' })).toBeInTheDocument();
    });
  });

  it('smooth-scrolls back to the account hero', async () => {
    renderAccountPage();
    const accountTop = document.getElementById('account-top') as HTMLElement;
    accountTop.scrollIntoView = jest.fn();

    fireEvent.click(await screen.findByRole('link', { name: 'Back to top' }));

    expect(accountTop.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('offers a destructive sign-out action at the bottom of the page', async () => {
    renderAccountPage();

    const signOutButtons = await screen.findAllByRole('button', { name: 'Sign Out' });
    const bottomSignOut = signOutButtons.find(button => button.closest('.account-page__sign-out'));
    expect(bottomSignOut).toHaveClass('workout-button--destructive');

    fireEvent.click(bottomSignOut as HTMLButtonElement);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
