import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeDraftEditor } from './ThemeDraftEditor';
import { THEME_DEFINITIONS } from '../themes/definitions';
import { compileTheme } from '../themes/compiler';

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver;
});

test('mode segments preserve seeds and reflect the current draft', () => {
  const original = THEME_DEFINITIONS[0];
  const update = jest.fn();
  const reset = jest.fn();
  const { rerender } = render(<ThemeDraftEditor draft={original} compilation={compileTheme(original)} update={update} reset={reset} />);
  const group = within(screen.getByRole('group', { name: 'Color generation mode' }));
  expect(group.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(group.getByRole('button', { name: 'Dark' }));
  expect(update).toHaveBeenLastCalledWith({ ...original, mode: 'dark' });
  fireEvent.click(group.getByRole('button', { name: 'Mixed' }));
  expect(update).toHaveBeenLastCalledWith({ ...original, mode: 'mixed' });
  const mixed = { ...original, mode: 'mixed' as const };
  rerender(<ThemeDraftEditor draft={mixed} compilation={compileTheme(mixed)} update={update} reset={reset} />);
  expect(group.getByRole('button', { name: 'Mixed' })).toHaveAttribute('aria-pressed', 'true');
});

test('diagnostics show seed, final color and derived input without inventing a failed result', () => {
  const draft = THEME_DEFINITIONS[0];
  const compilation = compileTheme(draft);
  compilation.diagnostics = [
    { severity: 'warning', message: 'Muted text adjusted.', seed: 'onSurface', colorChange: { from: '#ffffff', input: '#aaaaaa', to: '#bbbbbb' } },
    { severity: 'error', message: 'No color meets contrast.', seed: 'primary', colorChange: { from: '#ffeeaa' } },
  ];
  render(<ThemeDraftEditor draft={draft} compilation={compilation} update={jest.fn()} reset={jest.fn()} />);
  const warning = screen.getByText('Muted text adjusted.', { exact: false }).closest('li')!;
  expect(warning).toHaveTextContent('Seed to adjust: onSurface');
  expect(warning).toHaveTextContent('Color change: #ffffff → #bbbbbb');
  expect(warning).toHaveTextContent('derived input: #aaaaaa');
  const failure = screen.getByText('No color meets contrast.', { exact: false }).closest('li')!;
  expect(failure).toHaveTextContent('Seed to adjust: primary');
  expect(failure).toHaveTextContent('Color change: #ffeeaa → No valid adjustment found.');
});
