import { fireEvent, render, screen } from '@testing-library/react';
import ThemeSandbox from './theme-sandbox';

jest.mock('../components/ResponsiveSegmentedControl', () => ({
  ResponsiveSegmentedControl: () => <div>Segmented control preview</div>,
}));

test('previews all themes temporarily and restores the original without writing storage', () => {
  document.documentElement.dataset.theme = 'dark';
  localStorage.setItem('iwyn-theme', 'dark');
  const { unmount } = render(<ThemeSandbox />);
  const picker = screen.getByLabelText('Preview theme');
  expect(picker.querySelectorAll('option')).toHaveLength(8);
  fireEvent.change(picker, { target: { value: 'sunset' } });
  expect(document.documentElement.dataset.theme).toBe('sunset');
  expect(localStorage.getItem('iwyn-theme')).toBe('dark');
  unmount();
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('sample actions and drawer controls work without changing account data', () => {
  render(<ThemeSandbox />);
  fireEvent.click(screen.getAllByRole('button', { name: 'primary neutral' })[0]);
  expect(screen.getByText(/Demo action completed/)).toHaveTextContent('No workout or account data was changed.');
  fireEvent.click(screen.getAllByRole('button', { name: 'Preview drawer' })[0]);
  expect(screen.getByRole('heading', { name: 'Preview drawer' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
});
