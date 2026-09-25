import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SystemAlertProvider } from '../context/SystemAlertContext';
import {
  createWeightEntry,
  deleteWeightEntry,
  fetchWeightEntries,
  updateWeightEntry,
} from '../services/weightService';
import { WeightTrackingSection } from './WeightTrackingSection';

jest.mock('react-chartjs-2', () => ({
  Line: ({ data }: { data: unknown }) => (
    <div data-testid="weight-chart">{JSON.stringify(data)}</div>
  ),
}));

jest.mock('../services/weightService', () => ({
  createWeightEntry: jest.fn(),
  deleteWeightEntry: jest.fn(),
  fetchWeightEntries: jest.fn(),
  updateWeightEntry: jest.fn(),
}));

const entries = [
  {
    id: 'entry-1',
    user_id: 'user-1',
    weight_kg: 79.379,
    weighed_on: '2026-09-20',
    created_at: '2026-09-20T08:00:00Z',
  },
  {
    id: 'entry-2',
    user_id: 'user-1',
    weight_kg: 79,
    weighed_on: '2026-09-20',
    created_at: '2026-09-20T18:00:00Z',
  },
];

const renderSection = (weightSystem: 'imperial' | 'metric' = 'imperial') =>
  render(
    <SystemAlertProvider>
      <WeightTrackingSection
        userId="user-1"
        weightSystem={weightSystem}
        theme="default"
      />
    </SystemAlertProvider>
  );

describe('WeightTrackingSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchWeightEntries as jest.Mock).mockResolvedValue({
      data: entries,
      error: null,
    });
    (createWeightEntry as jest.Mock).mockResolvedValue({
      data: {
        id: 'entry-3',
        user_id: 'user-1',
        weight_kg: 81.647,
        weighed_on: '2026-09-24',
        created_at: '2026-09-24T12:00:00Z',
      },
      error: null,
    });
    (updateWeightEntry as jest.Mock).mockResolvedValue({
      data: { ...entries[1], weight_kg: 80 },
      error: null,
    });
    (deleteWeightEntry as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('keeps multiple same-day entries and converts the chart to the preferred unit', async () => {
    renderSection();

    const chart = await screen.findByTestId('weight-chart');
    expect(chart).toHaveTextContent('Body Weight (lbs)');
    expect(chart.textContent?.match(/Sep 20, 2026/g)).toHaveLength(2);
    expect(chart).toHaveTextContent('175.001');
  });

  it('adds a dated weigh-in using canonical kilograms', async () => {
    renderSection();
    await screen.findByTestId('weight-chart');
    fireEvent.click(screen.getByRole('button', { name: 'Add Weigh-in' }));

    const drawer = document.querySelector('.drawer-panel') as HTMLElement;
    fireEvent.change(within(drawer).getByLabelText('Weight'), {
      target: { value: '180' },
    });
    fireEvent.change(within(drawer).getByLabelText('Date'), {
      target: { value: '2026-09-24' },
    });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(createWeightEntry).toHaveBeenCalledWith({
        userId: 'user-1',
        weightKg: 81.647,
        weighedOn: '2026-09-24',
      })
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Weigh-in added.');
  });

  it('edits without changing creation order and deletes after confirmation', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderSection('metric');
    await screen.findByTestId('weight-chart');
    fireEvent.click(screen.getByRole('button', { name: 'Edit Weigh-ins' }));

    const drawer = document.querySelector('.drawer-panel') as HTMLElement;
    const entryButtons = within(drawer).getAllByRole('button', {
      name: /Sep 20, 2026/,
    });
    fireEvent.click(entryButtons[0]);
    fireEvent.change(within(drawer).getByLabelText('Weight'), {
      target: { value: '80' },
    });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateWeightEntry).toHaveBeenCalledWith({
        id: 'entry-2',
        userId: 'user-1',
        weightKg: 80,
        weighedOn: '2026-09-20',
      })
    );
    expect(updateWeightEntry).not.toHaveBeenCalledWith(
      expect.objectContaining({ created_at: expect.anything() })
    );

    await within(drawer).findByRole('heading', { name: 'Edit weigh-ins' });
    fireEvent.click(
      within(drawer).getAllByRole('button', { name: /Sep 20, 2026/ })[0]
    );
    fireEvent.click(within(drawer).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(deleteWeightEntry).toHaveBeenCalledWith({
        id: 'entry-2',
        userId: 'user-1',
      })
    );
    expect(confirm).toHaveBeenCalledWith('Delete this weigh-in permanently?');
    confirm.mockRestore();
  });

  it('rejects future dates before calling the service', async () => {
    renderSection();
    await screen.findByTestId('weight-chart');
    fireEvent.click(screen.getByRole('button', { name: 'Add Weigh-in' }));
    const drawer = document.querySelector('.drawer-panel') as HTMLElement;
    fireEvent.change(within(drawer).getByLabelText('Weight'), {
      target: { value: '180' },
    });
    fireEvent.change(within(drawer).getByLabelText('Date'), {
      target: { value: '2999-01-01' },
    });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose today or an earlier date.'
    );
    expect(createWeightEntry).not.toHaveBeenCalled();
  });
});
