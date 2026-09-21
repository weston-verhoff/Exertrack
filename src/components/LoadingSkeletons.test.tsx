import { render, screen } from '@testing-library/react';
import {
  ChartSkeleton,
  WorkoutCardSkeletonGrid,
} from './LoadingSkeletons';

describe('loading skeletons', () => {
  it('renders a theme-toned, two-row workout grid', () => {
    const { container } = render(
      <WorkoutCardSkeletonGrid
        rows={2}
        tone="library"
        label="Loading templates"
      />
    );

    expect(screen.getByRole('status', { name: 'Loading templates' })).toHaveClass(
      'workout-skeleton-grid--rows-2'
    );
    expect(container.querySelectorAll('.workout-card-skeleton')).toHaveLength(12);
    expect(container.querySelector('.workout-card-skeleton')).toHaveAttribute(
      'data-tone',
      'library'
    );
  });

  it('renders a chart-body loading status', () => {
    render(<ChartSkeleton />);

    expect(
      screen.getByRole('status', { name: 'Loading strength volume chart' })
    ).toHaveClass('chart-skeleton');
  });
});
