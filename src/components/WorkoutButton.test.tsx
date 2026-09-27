import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkoutButton, WorkoutButtonIntent, WorkoutButtonVariant } from './WorkoutButton';

describe('WorkoutButton hierarchy', () => {
  const variants: WorkoutButtonVariant[] = ['primary', 'secondary', 'quiet'];
  const intents: WorkoutButtonIntent[] = ['neutral', 'positive', 'danger'];

  it.each(variants.flatMap(variant => intents.map(intent => [variant, intent] as const)))(
    'applies the %s and %s roles together',
    (variant, intent) => {
      render(<WorkoutButton label={`${variant}-${intent}`} variant={variant} intent={intent} />);
      expect(screen.getByRole('button')).toHaveClass(`workout-button--${variant}`, `workout-button--${intent}`);
    }
  );

  it('keeps its loading width, label, and disabled semantics stable', () => {
    render(<WorkoutButton label="Save" loading loadingLabel="Saving changes..." />);
    const button = screen.getByRole('button', { name: 'Saving changes...' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.style.minWidth).toBe('20ch');
  });

  it('supports icon-only labels and native form submission', () => {
    const submit = jest.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <>
        <WorkoutButton label="Delete" icon={<span>icon</span>} iconOnly intent="danger" variant="secondary" />
        <form onSubmit={submit}><WorkoutButton label="Save" type="submit" /></form>
      </>
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('workout-button--icon-only');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(submit).toHaveBeenCalled();
  });

  it('keeps positive and danger secondary states independent from the secondary accent palette', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../styles/workout-button.css'), 'utf8');
    const positive = css.match(/\.workout-button--secondary\.workout-button--positive\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const danger = css.match(/\.workout-button--secondary\.workout-button--danger\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    expect(positive).not.toContain('--color-interactive-secondary');
    expect(danger).not.toContain('--color-interactive-secondary');
    expect(positive).toContain('--color-interactive-positive-subtle');
    expect(danger).toContain('--color-interactive-danger-subtle');
  });

  it('defines interaction, disabled, and reduced-motion states in shared CSS', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../styles/workout-button.css'), 'utf8');
    expect(css).toContain('.workout-button:hover:not(:disabled)');
    expect(css).toContain('.workout-button:active:not(:disabled)');
    expect(css).toContain('.workout-button:disabled');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('min-height: 44px');
  });
});
