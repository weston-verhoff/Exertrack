import { act, fireEvent, render, screen } from '@testing-library/react';
import { SystemAlertProvider, useSystemAlerts } from './SystemAlertContext';

function AlertHarness() {
  const { dismissAlertGroup, showAlert } = useSystemAlerts();

  return (
    <>
      <button onClick={() => showAlert('Saving...', { replaceKey: 'save' })}>Saving</button>
      <button
        onClick={() => showAlert('Saved!', { tone: 'success', replaceKey: 'save' })}
      >
        Saved
      </button>
      <button onClick={() => showAlert('First error', { tone: 'error' })}>Error one</button>
      <button onClick={() => showAlert('Second error', { tone: 'error' })}>Error two</button>
      <button onClick={() => showAlert('Third error', { tone: 'error' })}>Error three</button>
      <button onClick={() => showAlert('Fourth error', { tone: 'error' })}>Error four</button>
      <button
        onClick={() => {
          dismissAlertGroup('save');
          showAlert('Save failed', { tone: 'error' });
        }}
      >
        Fail save
      </button>
    </>
  );
}

describe('SystemAlertProvider', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('replaces alerts that share a replacement key and stacks errors', () => {
    render(
      <SystemAlertProvider>
        <AlertHarness />
      </SystemAlertProvider>
    );

    fireEvent.click(screen.getByText('Saving'));
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Saved'));
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    expect(screen.getByText('Saved!')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Error one'));
    fireEvent.click(screen.getByText('Error two'));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('fades after six seconds and removes after the exit transition', () => {
    render(
      <SystemAlertProvider>
        <AlertHarness />
      </SystemAlertProvider>
    );
    fireEvent.click(screen.getByText('Saving'));

    act(() => jest.advanceTimersByTime(6000));
    expect(screen.getByText('Saving...').closest('.system-alert')).toHaveClass(
      'system-alert--exiting'
    );

    act(() => jest.advanceTimersByTime(300));
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
  });

  it('removes immediately when its close button is tapped', () => {
    render(
      <SystemAlertProvider>
        <AlertHarness />
      </SystemAlertProvider>
    );
    fireEvent.click(screen.getByText('Saving'));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss: Saving...' }));

    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
  });

  it('clears a progress group without replacing its stackable error', () => {
    render(
      <SystemAlertProvider>
        <AlertHarness />
      </SystemAlertProvider>
    );
    fireEvent.click(screen.getByText('Saving'));
    fireEvent.click(screen.getByText('Fail save'));
    fireEvent.click(screen.getByText('Error one'));

    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('keeps at most three banners and removes the oldest first', () => {
    render(
      <SystemAlertProvider>
        <AlertHarness />
      </SystemAlertProvider>
    );
    fireEvent.click(screen.getByText('Error one'));
    fireEvent.click(screen.getByText('Error two'));
    fireEvent.click(screen.getByText('Error three'));
    fireEvent.click(screen.getByText('Error four'));

    expect(screen.getAllByRole('alert')).toHaveLength(3);
    expect(screen.getByText('First error').closest('.system-alert')).toHaveClass(
      'system-alert--exiting'
    );

    act(() => jest.advanceTimersByTime(300));
    expect(screen.queryByText('First error')).not.toBeInTheDocument();
    expect(screen.getByText('Fourth error')).toBeInTheDocument();
  });
});
