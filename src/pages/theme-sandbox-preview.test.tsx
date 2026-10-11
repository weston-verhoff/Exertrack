import { fireEvent, render, screen, within } from '@testing-library/react';
import ThemeSandbox from './theme-sandbox-preview';
import { APP_THEMES } from '../themes/registry.generated';
import { THEME_DEFINITIONS } from '../themes/definitions';
jest.mock('../components/ThemeSandboxScreens', () => ({ ThemeSandboxScreens: () => <div>Production screens</div>, SandboxWorkoutEditor: () => <div>Production editor</div> }));

jest.mock('../components/ResponsiveSegmentedControl', () => ({
  ResponsiveSegmentedControl: ({ options, value, onChange }: any) => <div>{options.map((option: any) =>
    <button key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>
  )}</div>,
}));

beforeEach(() => sessionStorage.clear());

test('restores legacy surface drafts and transitions between solid, gradient and empty fills', () => {
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { supports: () => true } });
  const original = THEME_DEFINITIONS.find(theme => theme.id === 'baseball')!;
  const { surfaceBackground: _oldSurface, ...withoutSurface } = original;
  const gradient = 'linear-gradient(red, blue)';
  sessionStorage.setItem('iwyn-sandbox-theme', 'baseball');
  sessionStorage.setItem('iwyn-sandbox-drafts-v1', JSON.stringify({ baseball: { ...withoutSurface, gradients: { surface: gradient } } }));
  render(<ThemeSandbox />);
  expect(screen.getByLabelText('Surface background')).toHaveValue(gradient);
  expect(JSON.parse(sessionStorage.getItem('iwyn-sandbox-drafts-v1')!).baseball.surfaceBackground).toBe(gradient);
  const seed = screen.getByLabelText('surface seed');
  fireEvent.change(screen.getByLabelText('Surface background'), { target: { value: '#1D2D40' } });
  expect(seed).toHaveValue('#000000');
  expect(document.documentElement.style.getPropertyValue('--sandbox-surface-color')).toBe('#1D2D40');
  expect(document.documentElement.style.getPropertyValue('--sandbox-surface-gradient')).toBe('none');
  fireEvent.change(screen.getByLabelText('Surface background'), { target: { value: '#bad' } });
  expect(screen.getByLabelText('Surface background')).toHaveAttribute('aria-invalid', 'true');
  expect(document.documentElement.style.getPropertyValue('--sandbox-surface-color')).toBe('#1D2D40');
  expect(screen.getByRole('button', { name: 'Export theme definition' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Surface background'), { target: { value: gradient } });
  expect(document.documentElement.style.getPropertyValue('--sandbox-surface-color')).toBe('');
  expect(document.documentElement.style.getPropertyValue('--sandbox-surface-gradient')).toBe(gradient);
  fireEvent.change(screen.getByLabelText('Surface background'), { target: { value: '' } });
  expect(document.documentElement.style.getPropertyValue('--sandbox-surface-gradient')).toBe('none');
  expect(document.documentElement.style.getPropertyValue('--sandbox-canvas-gradient')).toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Reset draft' }));
  expect(screen.getByLabelText('Surface background')).toHaveValue('#1D2D40');
});

test('hero logo selector swaps local artwork and restores the theme logo', () => {
  render(<ThemeSandbox />);
  const control = within(screen.getByRole('group', { name: 'Hero logo selection' }));
  const artwork = screen.getByRole('img', { name: 'IWYN Fitness' });
  const originalBrand = document.documentElement.style.getPropertyValue('--image-brand-wordmark');
  expect(artwork).toHaveAttribute('data-logo-variant', 'theme');
  for (const [label, variant] of [['Light logo', 'light'], ['Dark logo', 'dark'], ['Neon logo', 'neon']]) {
    fireEvent.click(control.getByRole('button', { name: label }));
    expect(control.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
    expect(artwork).toHaveAttribute('data-logo-variant', variant);
    expect(artwork.style.backgroundImage).toContain('url(');
    expect(document.documentElement.style.getPropertyValue('--image-brand-wordmark')).toBe(originalBrand);
  }
  fireEvent.click(control.getByRole('button', { name: 'Theme logo' }));
  expect(artwork.style.backgroundImage).toBe('');
  expect(artwork).toHaveAttribute('data-logo-variant', 'theme');
});

test('gradient drafts retain independent previews, persist, switch modes and reset', () => {
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { supports: (_property: string, value: string) => !value.includes('bogus') } });
  sessionStorage.setItem('iwyn-sandbox-theme', 'sunset');
  const { unmount } = render(<ThemeSandbox />);
  fireEvent.click(screen.getByRole('button', { name: 'Mixed' }));
  const canvas = 'linear-gradient(to bottom, #76b4ff, #fff0a0)';
  const surface = 'radial-gradient(circle, #ef632d, #5925a0)';
  fireEvent.change(screen.getByLabelText('Canvas gradient'), { target: { value: canvas } });
  fireEvent.change(screen.getByLabelText('Surface background'), { target: { value: surface } });
  expect(document.documentElement.style.getPropertyValue('--sandbox-canvas-gradient')).toBe(canvas);
  expect(document.documentElement.style.getPropertyValue('--sandbox-surface-gradient')).toBe(surface);
  fireEvent.change(screen.getByLabelText('Surface background'), { target: { value: 'linear-gradient(bogus)' } });
  expect(screen.getByLabelText('Surface background')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('button', { name: 'Export theme definition' })).toBeDisabled();
  expect(document.documentElement.style.getPropertyValue('--sandbox-surface-gradient')).toBe(surface);
  expect(document.documentElement.style.getPropertyValue('--sandbox-canvas-gradient')).toBe(canvas);
  fireEvent.change(screen.getByLabelText('Surface background'), { target: { value: surface } });
  expect(screen.getByRole('button', { name: 'Export theme definition' })).toBeEnabled();
  const saved = JSON.parse(sessionStorage.getItem('iwyn-sandbox-drafts-v1')!).sunset;
  expect(saved.gradients).toEqual({ canvas });
  expect(saved.surfaceBackground).toBe(surface);
  fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
  expect(screen.queryByLabelText('Canvas gradient')).not.toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue('--sandbox-canvas-gradient')).toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Mixed' }));
  expect(screen.getByLabelText('Canvas gradient')).toHaveValue(canvas);
  fireEvent.change(screen.getByLabelText('Preview theme'), { target: { value: 'default' } });
  expect(document.documentElement.style.getPropertyValue('--sandbox-surface-gradient')).toBe('none');
  fireEvent.change(screen.getByLabelText('Preview theme'), { target: { value: 'sunset' } });
  unmount();
  expect(document.documentElement).not.toHaveAttribute('data-sandbox-gradient-mode');
  render(<ThemeSandbox />);
  expect(screen.getByLabelText('Surface background')).toHaveValue(surface);
  fireEvent.change(screen.getByLabelText('Canvas gradient'), { target: { value: '' } });
  expect(document.documentElement.style.getPropertyValue('--sandbox-canvas-gradient')).toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Reset draft' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mixed' }));
  expect(screen.getByLabelText('Surface background')).toHaveValue(THEME_DEFINITIONS.find(theme => theme.id === 'sunset')!.surfaceBackground);
});

test('persists mixed mode per theme, restores it and resets to the original mode', () => {
  sessionStorage.setItem('iwyn-sandbox-theme', 'sunset');
  const { unmount } = render(<ThemeSandbox />);
  fireEvent.click(screen.getByRole('button', { name: 'Mixed' }));
  fireEvent.change(screen.getByLabelText('canvas seed'), { target: { value: '#c2ddff' } });
  fireEvent.change(screen.getByLabelText('on-canvas seed'), { target: { value: '#102a43' } });
  fireEvent.change(screen.getByLabelText('on-surface seed'), { target: { value: '#fff4df' } });
  expect(document.documentElement.style.getPropertyValue('--color-on-canvas')).toBe('#102a43');
  expect(document.documentElement.style.getPropertyValue('--color-on-surface')).toBe('#fff4df');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue('--color-on-canvas')).not.toBe(document.documentElement.style.getPropertyValue('--color-on-surface'));
  fireEvent.change(screen.getByLabelText('Preview theme'), { target: { value: 'default' } });
  expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.change(screen.getByLabelText('Preview theme'), { target: { value: 'sunset' } });
  expect(screen.getByRole('button', { name: 'Mixed' })).toHaveAttribute('aria-pressed', 'true');
  unmount();
  render(<ThemeSandbox />);
  expect(screen.getByRole('button', { name: 'Mixed' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('on-canvas seed')).toHaveValue('#102a43');
  expect(screen.getByLabelText('on-surface seed')).toHaveValue('#fff4df');
  fireEvent.change(screen.getByLabelText('on-canvas seed'), { target: { value: '#bad' } });
  expect(screen.getByRole('button', { name: 'Export theme definition' })).toBeDisabled();
  expect(document.documentElement.style.getPropertyValue('--color-on-canvas')).toBe('#102a43');
  fireEvent.click(screen.getByRole('button', { name: 'Reset draft' }));
  expect(screen.getByRole('button', { name: 'Mixed' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('canvas seed')).toHaveValue('#000000');
  expect(screen.getByLabelText('on-canvas seed')).toHaveValue('#ffffff');
});

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
