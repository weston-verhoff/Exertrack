import { fireEvent, render, screen } from '@testing-library/react';
import { ExerciseChip } from './ExerciseChip';

describe('ExerciseChip', () => {
  it('renders shared content, tone, icon, and action semantics', () => {
    const onClick = jest.fn();

    render(
      <ExerciseChip
        name="Cable Row"
        meta="Back · Strength"
        icon={<span>+</span>}
        ariaLabel="Add Cable Row"
        onClick={onClick}
        tone="library"
      />
    );

    const chip = screen.getByRole('button', { name: 'Add Cable Row' });
    expect(chip).toHaveClass('exercise-chip');
    expect(chip).toHaveAttribute('data-tone', 'library');
    expect(screen.getByText('Cable Row')).toBeInTheDocument();
    expect(screen.getByText('Back · Strength')).toBeInTheDocument();
    expect(screen.getByText('+').closest('.exercise-chip__icon')).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
