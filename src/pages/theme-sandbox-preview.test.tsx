import { fireEvent, render, screen } from '@testing-library/react';
import ThemeSandbox from './theme-sandbox-preview';
import { APP_THEMES } from '../themes/registry.generated';
jest.mock('../components/ThemeSandboxScreens', () => ({ ThemeSandboxScreens: () => <div>Production screens</div>, SandboxWorkoutEditor: () => <div>Production editor</div> }));

jest.mock('../components/ResponsiveSegmentedControl', () => ({
  ResponsiveSegmentedControl: () => <div>Segmented control preview</div>,
}));

beforeEach(() => sessionStorage.clear());

test('keeps the last valid palette for invalid drafts, restores drafts and resets them', () => {
  sessionStorage.setItem('iwyn-sandbox-theme', 'neon');
  const { unmount } = render(<ThemeSandbox />);
  fireEvent.change(screen.getByLabelText('primary seed'), { target: { value: '#dd66ff' } });
  const accepted = document.documentElement.style.getPropertyValue('--color-interactive-primary');
  expect(accepted).toBeTruthy();
  fireEvent.change(screen.getByLabelText('primary seed'), { target: { value: '#bad' } });
  expect(screen.getByRole('alert')).toHaveTextContent('last valid palette');
  expect(document.documentElement.style.getPropertyValue('--color-interactive-primary')).toBe(accepted);
  expect(screen.getByRole('button', { name: 'Export theme definition' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Preview theme'), { target: { value: 'default' } });
  fireEvent.change(screen.getByLabelText('Preview theme'), { target: { value: 'neon' } });
  expect(screen.getByLabelText('primary seed')).toHaveValue('#bad');
  unmount();
  render(<ThemeSandbox />);
  expect(screen.getByLabelText('primary seed')).toHaveValue('#bad');
  fireEvent.click(screen.getByRole('button', { name: 'Reset draft' }));
  expect(screen.getByLabelText('primary seed')).toHaveValue('#ff2ca8');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('uses the iframe document root and remembers the preview without changing app storage', () => {
  document.documentElement.dataset.theme = 'dark';
  localStorage.setItem('iwyn-theme', 'dark');
  const { unmount } = render(<ThemeSandbox />);
  const picker = screen.getByLabelText('Preview theme');
  expect(picker.querySelectorAll('option')).toHaveLength(APP_THEMES.length);
  fireEvent.change(picker, { target: { value: 'sunset' } });
  expect(document.documentElement.dataset.theme).toBe('sunset');
  expect(document.querySelector('.theme-sandbox')).not.toHaveAttribute('data-theme');
  expect(localStorage.getItem('iwyn-theme')).toBe('dark');
  unmount();
  expect(localStorage.getItem('iwyn-theme')).toBe('dark');
  render(<ThemeSandbox />);
  expect(screen.getByLabelText('Preview theme')).toHaveValue('sunset');
});

test('retains the preview on focus and keeps portal contents in the preview document', () => {
  const { rerender } = render(<ThemeSandbox />);
  fireEvent.change(screen.getByLabelText('Preview theme'), { target: { value: 'neon' } });
  window.dispatchEvent(new Event('focus'));
  rerender(<ThemeSandbox />);
  expect(screen.getByLabelText('Preview theme')).toHaveValue('neon');
  expect(document.documentElement).toHaveAttribute('data-theme', 'neon');
  fireEvent.click(screen.getAllByRole('button', { name: 'Preview drawer' })[0]);
  expect(screen.getByRole('heading', { name: 'Preview drawer' }).closest('[data-theme]')).toHaveAttribute('data-theme', 'neon');
});

test('sample actions and drawer controls work without changing account data', () => {
  render(<ThemeSandbox />);
  fireEvent.click(screen.getAllByRole('button', { name: 'primary neutral' })[0]);
  expect(screen.getByText(/Demo action completed/)).toHaveTextContent('No workout or account data was changed.');
  fireEvent.click(screen.getAllByRole('button', { name: 'Preview drawer' })[0]);
  expect(screen.getByRole('heading', { name: 'Preview drawer' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
});
