import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BulkDeleteDialog } from './BulkDeleteDialog';

describe('BulkDeleteDialog', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false }));
  });

  afterEach(() => jest.useRealTimers());

  it('requires an uninterrupted three-second hold', async () => {
    const onConfirm = jest.fn().mockResolvedValue(true);
    render(<BulkDeleteDialog count={3} onCancel={jest.fn()} onConfirm={onConfirm} />);
    const hold = screen.getByRole('button', { name: /press & hold to delete/i });

    fireEvent.keyDown(hold, { key: 'Enter' });
    expect(hold).toHaveClass('bulk-delete-hold--active');
    expect(hold.querySelector('.bulk-delete-hold__progress')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(2999));
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('opens typed confirmation for reduced motion and normalizes the phrase', async () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
    }));
    const onConfirm = jest.fn().mockResolvedValue(true);
    render(<BulkDeleteDialog count={2} onCancel={jest.fn()} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  delete workouts  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 workouts' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('can switch between confirmation methods and remembers the latest choice', () => {
    const { unmount } = render(<BulkDeleteDialog count={2} onCancel={jest.fn()} onConfirm={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Type instead' }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(window.localStorage.getItem('iwyn-delete-confirmation-mode')).toBe('type');

    fireEvent.click(screen.getByRole('button', { name: 'Use press & hold instead' }));
    expect(screen.getByRole('button', { name: /press & hold to delete/i })).toBeInTheDocument();
    expect(window.localStorage.getItem('iwyn-delete-confirmation-mode')).toBe('hold');

    unmount();
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
    }));
    render(<BulkDeleteDialog count={2} onCancel={jest.fn()} onConfirm={jest.fn()} />);
    expect(screen.getByRole('button', { name: /press & hold to delete/i })).toBeInTheDocument();
  });
});
