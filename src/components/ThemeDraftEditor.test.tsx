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
