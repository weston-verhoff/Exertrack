import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkoutExportDrawer } from './WorkoutExportDrawer';

describe('WorkoutExportDrawer', () => {
  it('validates and submits an inclusive custom date range', async () => {
    const onExport = jest.fn().mockResolvedValue(true);
    render(<WorkoutExportDrawer isOpen onClose={jest.fn()} onExport={onExport} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Custom date range' }));
    const exportButton = screen.getByRole('button', { name: 'Export' });
    expect(exportButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-09-20' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-09-25' } });
    fireEvent.click(exportButton);

    await waitFor(() => expect(onExport).toHaveBeenCalledWith('custom-range', {
      startDate: '2026-09-20',
      endDate: '2026-09-25',
    }));
  });
});
