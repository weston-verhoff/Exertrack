import { act, fireEvent, render, screen } from '@testing-library/react';
import { SystemAlertProvider } from '../context/SystemAlertContext';
import StatusButton from './StatusButton';

describe('StatusButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('uses positive feedback temporarily and returns to its neutral role', async () => {
    const onClick = jest.fn().mockResolvedValue(undefined);

    render(
      <SystemAlertProvider>
        <StatusButton onClick={onClick} idleLabel="Save changes" successLabel="Saved" />
      </SystemAlertProvider>
    );

    const idleButton = screen.getByRole('button', { name: 'Save changes' });
    expect(idleButton).toHaveClass('workout-button--neutral');

    await act(async () => {
      fireEvent.click(idleButton);
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: 'Saved' })).toHaveClass('workout-button--positive');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveClass('workout-button--neutral');
  });
});
