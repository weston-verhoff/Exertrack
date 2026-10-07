import { fireEvent, render, screen } from '@testing-library/react';
import ThemeSandbox from './theme-sandbox';

jest.mock('../components/ResponsiveSegmentedControl', () => ({
  ResponsiveSegmentedControl: () => <div>Segmented control preview</div>,
}));

beforeEach(() => sessionStorage.clear());

test('keeps the preview scoped and remembers it after leaving and returning', () => {
  document.documentElement.dataset.theme = 'dark';
  localStorage.setItem('iwyn-theme', 'dark');
  const { unmount } = render(<ThemeSandbox />);
  const picker = screen.getByLabelText('Preview theme');
  expect(picker.querySelectorAll('option')).toHaveLength(8);
  fireEvent.change(picker, { target: { value: 'sunset' } });
  expect(document.querySelector('.theme-sandbox')).toHaveAttribute('data-theme', 'sunset');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem('iwyn-theme')).toBe('dark');
  unmount();
  expect(document.documentElement.dataset.theme).toBe('dark');
  render(<ThemeSandbox />);
  expect(screen.getByLabelText('Preview theme')).toHaveValue('sunset');
});

test('retains the preview when returning to a browser tab refreshes the app theme', () => {
  const { rerender } = render(<ThemeSandbox />);
  fireEvent.change(screen.getByLabelText('Preview theme'), { target: { value: 'neon' } });
  document.documentElement.dataset.theme = 'default';
  window.dispatchEvent(new Event('focus'));
  rerender(<ThemeSandbox />);
  expect(screen.getByLabelText('Preview theme')).toHaveValue('neon');
  expect(document.querySelector('.theme-sandbox')).toHaveAttribute('data-theme', 'neon');
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
